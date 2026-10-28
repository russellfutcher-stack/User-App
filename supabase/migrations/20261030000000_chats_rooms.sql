-- Phase 1, step 3: one-to-one chats and rooms. Safe to run more than once.
-- Members never write these tables directly: every change goes through the functions below, which check blocks,
-- membership and lengths. Members can read only their own chats, and the posts of rooms that aren't deleted.
-- The wording checks (dealing, contact details, crisis words) run in the app until the server safety check in step 4.

-- ---------- Chats ----------
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles on delete cascade,
  b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (a < b), unique (a, b)
);
-- Each member's view of a chat: when they last read it, and whether they deleted it from their list.
create table if not exists public.chat_state (
  chat_id uuid not null references public.chats on delete cascade,
  member uuid not null references public.profiles on delete cascade,
  last_read_at timestamptz not null default now(),
  hidden boolean not null default false,
  primary key (chat_id, member)
);
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.chats on delete cascade,
  sender uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_chat on public.messages (chat_id, created_at);

alter table public.chats enable row level security;
alter table public.chat_state enable row level security;
alter table public.messages enable row level security;
drop policy if exists "Read own chats" on public.chats;
create policy "Read own chats" on public.chats for select to authenticated using ((select auth.uid()) in (a, b));
drop policy if exists "Read own chat state" on public.chat_state;
create policy "Read own chat state" on public.chat_state for select to authenticated using (member = (select auth.uid()));
drop policy if exists "Read messages in own chats" on public.messages;
create policy "Read messages in own chats" on public.messages for select to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id and (select auth.uid()) in (c.a, c.b)));
revoke insert, update, delete on public.chats, public.chat_state, public.messages from anon, authenticated;
grant select on public.chats, public.chat_state, public.messages to authenticated;

create or replace function public.blocked_between(x uuid, y uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x));
$$;
create or replace function public.member_id(name text) returns uuid language sql stable set search_path = '' as $$
  select id from public.profiles where username operator(public.=) name::public.citext;
$$;
create or replace function public.chat_with(me uuid, them uuid) returns uuid language sql stable set search_path = '' as $$
  select id from public.chats where a = least(me, them) and b = greatest(me, them);
$$;

-- "People I chat with": both have sent at least one message. Replaces the step 2 placeholder.
create or replace function public.chat_partners(a uuid, b uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.chats c where c.a = least(a, b) and c.b = greatest(a, b)
    and exists (select 1 from public.messages m where m.chat_id = c.id and m.sender = c.a)
    and exists (select 1 from public.messages m where m.chat_id = c.id and m.sender = c.b));
$$;

-- My chats, newest first: who with, the last message, and whether it's unread. Leaves out deleted and blocked chats.
create or replace function public.my_chats()
returns table (with_name text, last_body text, last_mine boolean, last_at timestamptz, unread boolean)
language sql stable security definer set search_path = '' as $$
  select p.username::text, m.body, m.sender = auth.uid(), m.created_at,
         m.sender <> auth.uid() and m.created_at > coalesce(s.last_read_at, '-infinity')
  from public.chats c
  join public.profiles p on p.id = case when c.a = auth.uid() then c.b else c.a end
  left join public.chat_state s on s.chat_id = c.id and s.member = auth.uid()
  join lateral (select * from public.messages x where x.chat_id = c.id order by x.created_at desc, x.id desc limit 1) m on true
  where auth.uid() in (c.a, c.b) and not coalesce(s.hidden, false) and not public.blocked_between(c.a, c.b)
  order by m.created_at desc;
$$;

-- The messages in my chat with `name`, oldest first. Opening a chat marks it read.
create or replace function public.chat_messages(name text)
returns table (id bigint, mine boolean, body text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid := public.member_id(name); c uuid := public.chat_with(me, them);
begin
  if c is null or public.blocked_between(me, them) then return; end if;
  insert into public.chat_state (chat_id, member, last_read_at) values (c, me, now())
    on conflict (chat_id, member) do update set last_read_at = now();
  return query select m.id, m.sender = me, m.body, m.created_at from public.messages m where m.chat_id = c order by m.created_at, m.id;
end $$;

create or replace function public.send_message(name text, body text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid := public.member_id(name); c uuid;
begin
  if me is null or them is null or them = me then raise exception 'no such member'; end if;
  if public.blocked_between(me, them) then raise exception 'blocked'; end if;
  if char_length(trim(body)) = 0 or char_length(body) > 1000 then raise exception 'length'; end if;
  insert into public.chats (a, b) values (least(me, them), greatest(me, them)) on conflict (a, b) do nothing;
  c := public.chat_with(me, them);
  -- A new message brings a deleted chat back for both people.
  insert into public.chat_state (chat_id, member, last_read_at) values (c, me, now()), (c, them, '-infinity')
    on conflict (chat_id, member) do update set hidden = false,
      last_read_at = case when excluded.member = me then now() else public.chat_state.last_read_at end;
  return query insert into public.messages (chat_id, sender, body) values (c, me, body) returning messages.id, messages.created_at;
end $$;

-- Deleting a chat only removes it from your own list; Undo puts it back.
create or replace function public.hide_chat(name text, hide boolean) returns void
language sql security definer set search_path = '' as $$
  update public.chat_state set hidden = hide
  where member = auth.uid() and chat_id = public.chat_with(auth.uid(), public.member_id(name));
$$;

-- ---------- Sample member replies (removed with the sample members before launch) ----------
create table if not exists public.sample_replies (
  username public.citext not null, -- '*' holds the replies for samples without their own
  n int not null, body text not null, primary key (username, n)
);
alter table public.sample_replies enable row level security;
revoke all on public.sample_replies from anon, authenticated;

-- A sample member answers your last message with their next prototype line.
create or replace function public.sample_reply(name text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid; c uuid; said int; total int; who text; reply text;
begin
  select p.id into them from public.profiles p where p.username operator(public.=) name::public.citext and p.is_sample;
  c := public.chat_with(me, them);
  if them is null or c is null or public.blocked_between(me, them) then return; end if;
  if (select m.sender from public.messages m where m.chat_id = c order by m.created_at desc, m.id desc limit 1) <> me then return; end if;
  who := case when exists (select 1 from public.sample_replies r where r.username operator(public.=) name::public.citext) then name else '*' end;
  select count(*) into total from public.sample_replies r where r.username operator(public.=) who::public.citext;
  if total = 0 then return; end if;
  select count(*) into said from public.messages m where m.chat_id = c and m.sender = them;
  select r.body into reply from public.sample_replies r where r.username operator(public.=) who::public.citext and r.n = said % total;
  return query insert into public.messages (chat_id, sender, body) values (c, them, reply) returning messages.id, messages.created_at;
end $$;

-- ---------- Rooms ----------
create table if not exists public.rooms (
  id text primary key,
  cat text not null check (cat in ('interests', 'drugs', 'mh')),
  name public.citext not null check (char_length(name) between 3 and 40),
  descr text not null check (char_length(descr) between 10 and 160),
  base_members int not null default 0, -- sample members counted in the built-in rooms
  created_by uuid references public.profiles on delete cascade,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists rooms_name on public.rooms (name) where not deleted;
create table if not exists public.room_members (
  room_id text not null references public.rooms on delete cascade,
  member uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, member)
);
create table if not exists public.room_posts (
  id bigint generated always as identity primary key,
  room_id text not null references public.rooms on delete cascade,
  author uuid references public.profiles on delete cascade, -- empty for posts from User itself
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists room_posts_room on public.room_posts (room_id, created_at);
create table if not exists public.room_requests (
  id text primary key references public.rooms on delete cascade,
  requester uuid not null references public.profiles on delete cascade,
  status text not null default 'Approved',
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_posts enable row level security;
alter table public.room_requests enable row level security;
drop policy if exists "Read rooms" on public.rooms;
create policy "Read rooms" on public.rooms for select to authenticated using (not deleted);
drop policy if exists "Read own memberships" on public.room_members;
create policy "Read own memberships" on public.room_members for select to authenticated using (member = (select auth.uid()));
drop policy if exists "Read room posts" on public.room_posts;
create policy "Read room posts" on public.room_posts for select to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and not r.deleted));
drop policy if exists "Read own requests" on public.room_requests;
create policy "Read own requests" on public.room_requests for select to authenticated using (requester = (select auth.uid()));
revoke insert, update, delete on public.rooms, public.room_members, public.room_posts, public.room_requests from anon, authenticated;
grant select on public.rooms, public.room_members, public.room_posts, public.room_requests to authenticated;

-- The 14 built-in rooms, copied from the prototype.
insert into public.rooms (id, cat, name, descr, base_members) values
  ('r1', 'interests', 'Dog Walkers'' Bench', 'Share walks and routes, and plan daytime walk-alongs in public places.', 128),
  ('r5', 'interests', 'Book Nook', 'Monthly read plus whatever you''re into. This month: The Left Hand of Darkness.', 143),
  ('r6', 'interests', 'Movie Night Fridays', 'Watch-along every Friday at 8pm. React in chat, no cameras, no pressure.', 188),
  ('r9', 'interests', 'Gamers'' Lounge', 'Co-op games, what you''re playing, finding a squad. No gambling or loot-box trading.', 102),
  ('r10', 'interests', 'Green Fingers', 'Gardens, allotments, houseplants and getting outside.', 67),
  ('r3', 'drugs', 'Early Days', 'First 90 days of any change: cutting down, stopping, starting over.', 96),
  ('r4', 'drugs', 'Taper Together', 'Tapering benzos, opioids or sleepers with your prescriber. Share what helps. No dosing advice.', 74),
  ('r11', 'drugs', 'Alcohol-Free Evenings', 'Getting through evenings without a drink. Swaps, recipes, and company.', 131),
  ('r12', 'drugs', 'Harm Reduction Space', 'For people still using. Safer use, naloxone, testing services. No sourcing, ever.', 58),
  ('r8', 'drugs', 'Family & Friends', 'For people supporting someone who uses substances.', 59),
  ('r7', 'mh', 'Anxiety Corner', 'Generalised, social anxiety and panic. Grounding tips, wins and bad days.', 167),
  ('r13', 'mh', 'Low Mood & Depression', 'Gentle space for heavy days. Small wins count here.', 149),
  ('r14', 'mh', 'PTSD Peer Space', 'Trauma survivors and veterans. No details of trauma required or expected.', 63),
  ('r15', 'mh', 'ADHD Hangout', 'Body-doubling, focus sprints, and people whose brains work like yours.', 88)
on conflict (id) do nothing;

-- Every room you can see, in catalogue order, with its member count and whether you've joined or made it.
create or replace function public.my_rooms()
returns table (id text, cat text, name text, descr text, members int, joined boolean, mine boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.cat, r.name::text, r.descr,
         r.base_members + (select count(*)::int from public.room_members m where m.room_id = r.id),
         exists (select 1 from public.room_members m where m.room_id = r.id and m.member = auth.uid()),
         r.created_by is not distinct from auth.uid() and r.created_by is not null
  from public.rooms r where not r.deleted
  order by array_position(array['r1','r5','r6','r9','r10','r3','r4','r11','r12','r8','r7','r13','r14','r15'], r.id) nulls last, r.created_at;
$$;

-- A room's posts, oldest first. Posts from people you've blocked, or who blocked you, are left out.
create or replace function public.room_posts_of(room text)
returns table (id bigint, who text, mine boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, coalesce(p.username::text, 'User'), x.author is not distinct from auth.uid(), x.body, x.created_at
  from public.room_posts x join public.rooms r on r.id = x.room_id and not r.deleted
  left join public.profiles p on p.id = x.author
  where x.room_id = room and (x.author is null or not public.blocked_between(x.author, auth.uid()))
  order by x.created_at, x.id;
$$;

create or replace function public.join_room(room text) returns void language sql security definer set search_path = '' as $$
  insert into public.room_members (room_id, member)
  select id, auth.uid() from public.rooms where id = room and not deleted on conflict do nothing;
$$;

create or replace function public.post_in_room(room text, body text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.room_members m join public.rooms r on r.id = m.room_id
                 where m.room_id = room and m.member = auth.uid() and not r.deleted) then raise exception 'not a member'; end if;
  if char_length(trim(body)) = 0 or char_length(body) > 1000 then raise exception 'length'; end if;
  return query insert into public.room_posts (room_id, author, body) values (room, auth.uid(), body) returning room_posts.id, room_posts.created_at;
end $$;

-- Leave a room, or delete it if you made it. undo_leave_room puts things back.
create or replace function public.leave_room(room text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rooms set deleted = true where id = room and created_by = auth.uid();
  delete from public.room_members where room_id = room and member = auth.uid();
end $$;
create or replace function public.undo_leave_room(room text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rooms set deleted = false where id = room and created_by = auth.uid()
    and not exists (select 1 from public.rooms o where o.name = (select name from public.rooms where id = room) and not o.deleted);
  insert into public.room_members (room_id, member) select id, auth.uid() from public.rooms where id = room and not deleted on conflict do nothing;
end $$;

-- Request a room. For now every request that passes the checks is approved straight away, and you join it.
-- At most 5 requests a day per member.
create or replace function public.request_room(name text, cat text, descr text) returns text
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare me uuid := auth.uid(); rid text := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  if me is null then raise exception 'sign in'; end if;
  if char_length(trim(name)) < 3 or char_length(name) > 40 or char_length(trim(descr)) < 10 or char_length(descr) > 160
     or cat not in ('interests', 'drugs', 'mh') then raise exception 'length'; end if;
  if exists (select 1 from public.rooms r where r.name operator(public.=) trim(name)::public.citext and not r.deleted) then raise exception 'taken'; end if;
  if (select count(*) from public.room_requests q where q.requester = me and q.created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many'; end if;
  insert into public.rooms (id, cat, name, descr, created_by) values (rid, cat, trim(name), trim(descr), me);
  insert into public.room_requests (id, requester) values (rid, me);
  insert into public.room_members (room_id, member) values (rid, me);
  insert into public.room_posts (room_id, author, body) values (rid, null, 'Welcome to ' || trim(name) || '. This room has just been created. Say hello!');
  return rid;
end $$;

create or replace function public.my_room_requests()
returns table (id text, name text, cat text, status text)
language sql stable security definer set search_path = '' as $$
  select q.id, r.name::text, r.cat, q.status from public.room_requests q join public.rooms r on r.id = q.id
  where q.requester = auth.uid() and not r.deleted order by q.created_at;
$$;

-- ---------- Fixes to step 1 ----------
-- Inside these functions the search path is empty, so a plain "=" on usernames was case-sensitive. These match any case.
create or replace function public.username_taken(name text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where username operator(public.=) name::public.citext);
$$;
create or replace function public.unblock(name text) returns void language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker = auth.uid()
    and blocked = (select id from public.profiles where username operator(public.=) name::public.citext);
$$;

-- ---------- Who may call what ----------
do $do$ declare f text; begin
  foreach f in array array['my_chats()', 'chat_messages(text)', 'send_message(text, text)', 'hide_chat(text, boolean)', 'sample_reply(text)',
    'my_rooms()', 'room_posts_of(text)', 'join_room(text)', 'post_in_room(text, text)', 'leave_room(text)', 'undo_leave_room(text)',
    'request_room(text, text, text)', 'my_room_requests()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['blocked_between(uuid, uuid)', 'member_id(text)', 'chat_with(uuid, uuid)', 'chat_partners(uuid, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $do$;

-- New messages and posts reach the app straight away (Supabase Realtime, which follows the read rules above).
do $do$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'room_posts') then
      alter publication supabase_realtime add table public.room_posts; end if;
  end if;
end $do$;
