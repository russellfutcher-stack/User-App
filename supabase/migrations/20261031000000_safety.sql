-- Phase 1, step 4: safety. Safe to run more than once.
-- Every chat message and room post is now checked by the safety check (supabase/functions/send) before anyone sees it.
-- Members can no longer send, post or create rooms directly: only the functions can, using the service key.
-- Every decision is logged with its reason and confidence. See docs/AI-agents-spec.md.

alter table public.profiles
  add column if not exists muted_until timestamptz,     -- can't send messages until then
  add column if not exists suspended_until timestamptz; -- can't send anything until then; 'infinity' while removal is reviewed

-- ---------- The decision log ----------
create table if not exists public.moderation (
  id bigint generated always as identity primary key,
  member uuid references public.profiles on delete cascade,
  kind text not null check (kind in ('message', 'post', 'room_request', 'report', 'review')),
  target text,     -- who or which room it was for
  body text,       -- kept only when something wasn't delivered, for reviews
  action text not null,
  category text, confidence real, reason text, model text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_member on public.moderation (member, created_at);
create table if not exists public.strikes (
  id bigint generated always as identity primary key,
  member uuid not null references public.profiles on delete cascade,
  category text not null,
  moderation_id bigint references public.moderation on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles on delete cascade,
  reported uuid not null references public.profiles on delete cascade,
  reason text not null, outcome text, note text,
  created_at timestamptz not null default now()
);
create sequence if not exists public.review_no start 1001;
create table if not exists public.reviews (
  id text primary key default 'HR-' || nextval('public.review_no'),
  member uuid not null references public.profiles on delete cascade,
  topic text not null, body text not null check (char_length(body) <= 500),
  auto boolean not null default false, urgent boolean not null default false,
  status text not null default 'Being reviewed',
  decision text, confidence real, reason text, note text, flagged boolean not null default false,
  decided_by text check (decided_by in ('automatic', 'arbitrator')),
  due_at timestamptz not null default now() + interval '72 hours',
  created_at timestamptz not null default now(), decided_at timestamptz
);
do $do$ declare t text; begin
  foreach t in array array['moderation', 'strikes', 'reports', 'reviews'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- ---------- Strikes ----------
-- 1 strike is a warning; 3 in 7 days is a 24-hour mute; 5 in 30 days is a 7-day suspension;
-- 3 dealing strikes in 7 days proposes removal: the account is paused and an urgent review is raised.
create or replace function public.add_strike(m uuid, cat text, mod_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare week int; month int; dealing int;
begin
  insert into public.strikes (member, category, moderation_id) values (m, cat, mod_id);
  select count(*) filter (where created_at > now() - interval '7 days'), count(*),
         count(*) filter (where category = 'dealing' and created_at > now() - interval '7 days')
    into week, month, dealing from public.strikes where member = m and created_at > now() - interval '30 days';
  if dealing >= 3 then
    update public.profiles set suspended_until = 'infinity' where id = m;
    insert into public.reviews (member, topic, body, auto, urgent, due_at)
      values (m, 'Account removal proposed', '3 or more blocked dealing messages in 7 days.', true, true, now() + interval '24 hours');
    return 'removal';
  elsif month >= 5 then update public.profiles set suspended_until = now() + interval '7 days' where id = m; return 'suspended';
  elsif week >= 3 then update public.profiles set muted_until = now() + interval '24 hours' where id = m; return 'muted';
  end if;
  return 'warning';
end $$;

create or replace function public.member_state(m uuid)
returns table (strikes int, muted_until timestamptz, suspended_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.strikes s where s.member = m and s.created_at > now() - interval '30 days'),
         p.muted_until, p.suspended_until from public.profiles p where p.id = m;
$$;

-- ---------- Delivering checked messages (called only by the functions) ----------
create or replace function public.deliver_message(sender uuid, name text, body text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare them uuid := public.member_id(name); c uuid;
begin
  if sender is null or them is null or them = sender then raise exception 'no such member'; end if;
  if public.blocked_between(sender, them) then raise exception 'blocked'; end if;
  if char_length(trim(body)) = 0 or char_length(body) > 1000 then raise exception 'length'; end if;
  insert into public.chats (a, b) values (least(sender, them), greatest(sender, them)) on conflict (a, b) do nothing;
  c := public.chat_with(sender, them);
  insert into public.chat_state (chat_id, member, last_read_at) values (c, sender, now()), (c, them, '-infinity')
    on conflict (chat_id, member) do update set hidden = false,
      last_read_at = case when excluded.member = sender then now() else public.chat_state.last_read_at end;
  return query insert into public.messages (chat_id, sender, body) values (c, sender, body) returning messages.id, messages.created_at;
end $$;

create or replace function public.deliver_post(author uuid, room text, body text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.room_members m join public.rooms r on r.id = m.room_id
                 where m.room_id = room and m.member = author and not r.deleted) then raise exception 'not a member'; end if;
  if char_length(trim(body)) = 0 or char_length(body) > 1000 then raise exception 'length'; end if;
  return query insert into public.room_posts (room_id, author, body) values (room, author, body) returning room_posts.id, room_posts.created_at;
end $$;

-- Room requests approved by the room check. At most 5 a day per member (Rusty, 29 Oct 2026).
create or replace function public.make_room(requester uuid, name text, cat text, descr text, welcome text) returns text
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare rid text := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  if char_length(trim(name)) < 3 or char_length(name) > 40 or char_length(trim(descr)) < 10 or char_length(descr) > 160
     or cat not in ('interests', 'drugs', 'mh') then raise exception 'length'; end if;
  if exists (select 1 from public.rooms r where r.name operator(public.=) trim(name)::public.citext and not r.deleted) then raise exception 'taken'; end if;
  if (select count(*) from public.room_requests q where q.requester = requester and q.created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many'; end if;
  insert into public.rooms (id, cat, name, descr, created_by) values (rid, cat, trim(name), trim(descr), requester);
  insert into public.room_requests (id, requester) values (rid, requester);
  insert into public.room_members (room_id, member) values (rid, requester);
  insert into public.room_posts (room_id, author, body) values (rid, null, coalesce(nullif(trim(welcome), ''), 'Welcome to ' || trim(name) || '. This room has just been created. Say hello!'));
  return rid;
end $$;
create or replace function public.requests_today(m uuid) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.room_requests where requester = m and created_at > now() - interval '1 day';
$$;

-- The last 20 messages between a reporter and the person they reported, for the report check. No usernames.
create or replace function public.report_context(reporter uuid, reported uuid)
returns table (who text, body text) language sql stable security definer set search_path = '' as $$
  select who, body from (
    select case when m.sender = reporter then 'Reporter' else 'Reported' end who, m.body, m.created_at, m.id
    from public.messages m where m.chat_id = public.chat_with(reporter, reported)
    order by m.created_at desc, m.id desc limit 20) x order by created_at, id;
$$;

-- ---------- Members' own reviews ----------
create or replace function public.my_reviews()
returns table (id text, topic text, body text, auto boolean, status text, note text, decided_by text, due_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.topic, r.body, r.auto, r.status, r.note, r.decided_by, r.due_at from public.reviews r
  where r.member = auth.uid() order by r.created_at desc;
$$;

-- ---------- Who may call what ----------
-- Sending, posting and making rooms directly are closed: the app goes through the checked functions.
do $do$ declare f text; begin
  foreach f in array array['send_message(text, text)', 'post_in_room(text, text)', 'request_room(text, text, text)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['add_strike(uuid, text, bigint)', 'member_state(uuid)', 'deliver_message(uuid, text, text)', 'deliver_post(uuid, text, text)',
    'make_room(uuid, text, text, text, text)', 'requests_today(uuid)', 'report_context(uuid, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  execute 'grant execute on function public.member_id(text), public.blocked_between(uuid, uuid), public.chat_with(uuid, uuid) to service_role';
  execute 'revoke execute on function public.my_reviews() from public, anon';
  execute 'grant execute on function public.my_reviews() to authenticated';
  execute 'grant all on public.moderation, public.strikes, public.reports, public.reviews to service_role';
  execute 'grant usage on sequence public.review_no to service_role';
end $do$;
