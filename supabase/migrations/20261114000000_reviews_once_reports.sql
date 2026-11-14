-- Rusty, 14 Nov 2026. Safe to run more than once.
-- 1. Any decision can be reviewed once only: a review records which decision it's about (reviews.about).
-- 2. The arbitrator sees every report, with the reporter's username (members never see who reported them).
-- 3. Nothing is held any more: 'held' now counts messages that weren't sent because the check couldn't run.

alter table public.reviews add column if not exists about text;
create unique index if not exists reviews_once on public.reviews (member, about) where about is not null;

create or replace function public.arb_reports() returns table (id bigint, reporter text, reported text, reason text, outcome text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  return query select r.id, coalesce(a.username::text, '(deleted)'), coalesce(b.username::text, '(deleted)'), r.reason, coalesce(r.outcome, 'pending'), r.created_at
    from public.reports r left join public.profiles a on a.id = r.reporter left join public.profiles b on b.id = r.reported
    order by r.created_at desc limit 50;
end $$;
revoke execute on function public.arb_reports() from public, anon;
grant execute on function public.arb_reports() to authenticated;

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
    'held', (select count(*) from checked where action in ('hold', 'unchecked')), -- not sent: the check couldn't run
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
