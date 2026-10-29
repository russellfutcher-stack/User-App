-- Phase 1, step 5: the arbitrator dashboard. Safe to run more than once.
-- The arbitrator is an independent person with an ordinary sign-in, listed in public.arbitrators. When they sign in,
-- the app shows the dashboard instead of the member pages. They see live figures, every review case and its decision,
-- and can change a decision with a note the member sees (docs/AI-agents-spec.md, section 3.5).
-- They see usernames, the case and the agent's reason, never profiles, bylines or chat history.
-- To make an account an arbitrator (Max does this; the account should not be used as a member):
--   insert into public.arbitrators (member) select id from public.profiles where username = '<username>';

create table if not exists public.arbitrators (
  member uuid primary key references public.profiles on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.arbitrators enable row level security;
revoke all on public.arbitrators from anon, authenticated;
grant all on public.arbitrators to service_role;

create or replace function public.am_arbitrator() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.arbitrators where member = auth.uid());
$$;

-- Real members only: not the sample members, and not arbitrators.
create or replace function public.real_members() returns setof public.profiles language sql stable security definer set search_path = '' as $$
  select p.* from public.profiles p join auth.users u on u.id = p.id
  where u.email not like '%@samples.user-app.invalid' and not exists (select 1 from public.arbitrators a where a.member = p.id);
$$;

-- Every figure on the dashboard, live. Only an arbitrator may call it.
create or replace function public.arb_figures() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare week timestamptz := now() - interval '7 days'; out jsonb;
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  with m as (select * from public.real_members()),
       seen as (select u.id, u.last_sign_in_at at from auth.users u join m on m.id = u.id),
       checked as (select * from public.moderation where kind in ('message', 'post') and created_at > week),
       peers as (select id from m where is_peer)
  select jsonb_build_object(
    'activeToday', (select count(*) from seen where at > now() - interval '1 day'),
    'activeWeek', (select count(*) from seen where at > week),
    'newMembers', (select count(*) from m where created_at > week),
    'peers', (select count(*) from peers),
    'wantPeers', (select count(*) from m where wants_peer),
    'flagged', (select count(*) from public.reviews where flagged and decided_by = 'automatic'),
    'urgent', (select count(*) from public.reviews where urgent and created_at > week),
    'checked', (select count(*) from checked),
    'blocked', (select count(*) from checked where action = 'block'),
    'help', (select count(*) from checked where action = 'help'),
    'held', (select count(*) from checked where action = 'hold'),
    'blockedBy', coalesce((select jsonb_agg(jsonb_build_array(category, n) order by n desc) from
      (select coalesce(category, 'other') category, count(*) n from checked where action = 'block' group by 1) x), '[]'),
    'reports', coalesce((select jsonb_agg(jsonb_build_array(reason, n) order by n desc) from
      (select reason, count(*) n from public.reports where created_at > week group by 1) x), '[]'),
    'blocksWeek', (select count(*) from public.blocks where created_at > week),
    'muted', (select count(*) from m where muted_until > now()),
    'suspended', (select count(*) from m where suspended_until > now() or suspended_until = 'infinity'),
    'ageChecks', (select count(*) from m where age_check_at is not null),
    'topBlocked', coalesce((select jsonb_agg(jsonb_build_array(username, b, r) order by b desc, r desc) from (
      select p.username::text username, count(distinct b.blocker) b,
             (select count(*) from public.reports r where r.reported = p.id) r
      from public.blocks b join m p on p.id = b.blocked group by p.id, p.username order by b desc limit 5) x), '[]'),
    'countries', coalesce((select jsonb_agg(jsonb_build_array(c, n) order by n desc) from
      (select coalesce(country, 'Not chosen yet') c, count(*) n from m group by 1) x), '[]'),
    'peerChats', (select count(*) from public.chats c where c.created_at > week and (c.a in (select id from peers) or c.b in (select id from peers))),
    'rooms', (select count(*) from public.rooms where not deleted),
    'roomsApproved', (select count(*) from public.room_requests where created_at > week),
    'roomsRefused', (select count(*) from public.moderation where kind = 'room_request' and action = 'refuse' and created_at > week),
    'autoDecided', (select count(*) from public.reviews where decided_by = 'automatic' and created_at > week),
    'reviewsWeek', (select count(*) from public.reviews where created_at > week),
    'autoSeconds', (select round(avg(extract(epoch from decided_at - created_at)))::int from public.reviews where decided_by = 'automatic' and created_at > week),
    'changedByArbitrator', (select count(*) from public.reviews where decided_by = 'arbitrator' and decided_at > week),
    'overdue', (select count(*) from public.reviews where decided_at is null and due_at < now()),
    'missed', (select count(*) from public.moderation where kind = 'recheck' and created_at > week)
  ) into out;
  return out;
end $$;

-- Every review case, urgent ones first, then newest. Usernames only.
create or replace function public.arb_cases()
returns table (id text, member text, topic text, body text, auto boolean, urgent boolean, status text, decision text,
               confidence real, reason text, note text, flagged boolean, decided_by text, due_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  return query select r.id, p.username::text, r.topic, r.body, r.auto, r.urgent, r.status, r.decision, r.confidence, r.reason, r.note,
                      r.flagged, r.decided_by, r.due_at, r.created_at
    from public.reviews r join public.profiles p on p.id = r.member
    order by (r.urgent and r.decided_by is distinct from 'arbitrator') desc, r.created_at desc limit 200;
end $$;

-- The arbitrator changes a decision. The note is shown to the member as "Arbitrator: …". Every change is logged.
create or replace function public.arb_decide(case_id text, outcome text, why text) returns void
language plpgsql security definer set search_path = '' as $$
declare m uuid;
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  if outcome not in ('Upheld', 'Overturned', 'Action changed') then raise exception 'bad outcome'; end if;
  if char_length(trim(why)) < 5 or char_length(why) > 400 then raise exception 'note'; end if;
  update public.reviews set status = 'Decided: ' || outcome, decision = outcome, note = trim(why), flagged = false,
         decided_by = 'arbitrator', decided_at = now() where id = case_id returning member into m;
  if m is null then raise exception 'no such case'; end if;
  insert into public.moderation (member, kind, target, action, reason) values (m, 'review', case_id, 'arbitrator: ' || outcome, trim(why));
end $$;

do $do$ declare f text; begin
  revoke execute on function public.real_members() from public, anon, authenticated;
  foreach f in array array['am_arbitrator()', 'arb_figures()', 'arb_cases()', 'arb_decide(text, text, text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $do$;
