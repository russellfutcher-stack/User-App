-- The arbitrator's decisions take effect (Rusty, 8 Nov 2026). Safe to run more than once.
-- Overturn lifts any mute, pause or age check on the member the case is about and takes back their latest strike.
-- Uphold keeps things as they are; on "Account removal proposed" it removes the account and everything in it.
-- Change the action applies one of: a warning (a strike), a 24-hour mute, a 7-day pause, unpause, or remove the account.

-- Who a case is about, when that isn't the member who raised it (an urgent report: the reported member).
alter table public.reviews add column if not exists subject uuid references public.profiles on delete set null;

drop function if exists public.arb_decide(text, text, text);
create or replace function public.arb_decide(case_id text, outcome text, why text, act text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare r record; target uuid; done text := 'recorded';
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  if outcome not in ('Upheld', 'Overturned', 'Action changed') then raise exception 'bad outcome'; end if;
  if char_length(trim(why)) < 5 or char_length(why) > 400 then raise exception 'note'; end if;
  if outcome <> 'Action changed' then act := null;
  elsif act is null or act not in ('warning', 'mute', 'pause', 'unpause', 'remove') then raise exception 'bad action'; end if;
  select * into r from public.reviews where id = case_id;
  if not found then raise exception 'no such case'; end if;
  target := coalesce(r.subject, r.member);
  if exists (select 1 from public.arbitrators where member = target) then raise exception 'arbitrator account'; end if;

  update public.reviews set status = 'Decided: ' || outcome || case act when 'warning' then ' (warning)' when 'mute' then ' (24-hour mute)'
           when 'pause' then ' (7-day pause)' when 'unpause' then ' (mute or pause lifted)' when 'remove' then ' (account removed)' else '' end,
         decision = outcome, note = trim(why), flagged = false, decided_by = 'arbitrator', decided_at = now() where id = case_id;
  insert into public.moderation (member, kind, target, action, reason)
    values (r.member, 'review', case_id, 'arbitrator: ' || outcome || coalesce(' (' || act || ')', ''), trim(why));

  if outcome = 'Overturned' or act = 'unpause' then
    update public.profiles set muted_until = null, suspended_until = null, age_check_at = null where id = target;
    if outcome = 'Overturned' then
      delete from public.strikes where id = (select id from public.strikes where member = target order by created_at desc limit 1);
    end if;
    done := 'lifted';
  elsif act = 'warning' then
    insert into public.strikes (member, category) values (target, 'arbitrator'); done := 'warned';
  elsif act = 'mute' then
    update public.profiles set muted_until = now() + interval '24 hours' where id = target; done := 'muted';
  elsif act = 'pause' then
    update public.profiles set suspended_until = now() + interval '7 days' where id = target; done := 'paused';
  end if;
  if act = 'remove' or (outcome = 'Upheld' and r.topic = 'Account removal proposed') then
    delete from auth.users where id = target; done := 'removed';
  end if;
  return done;
end $$;
revoke execute on function public.arb_decide(text, text, text, text) from public, anon;
grant execute on function public.arb_decide(text, text, text, text) to authenticated;

-- The cases, now with who each is about.
drop function if exists public.arb_cases();
create or replace function public.arb_cases()
returns table (id text, member text, subject text, topic text, body text, auto boolean, urgent boolean, status text, decision text,
               confidence real, reason text, note text, flagged boolean, decided_by text, due_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  return query select r.id, p.username::text, coalesce(s.username, p.username)::text, r.topic, r.body, r.auto, r.urgent, r.status, r.decision,
                      r.confidence, r.reason, r.note, r.flagged, r.decided_by, r.due_at, r.created_at
    from public.reviews r join public.profiles p on p.id = r.member left join public.profiles s on s.id = r.subject
    order by (r.urgent and r.decided_by is distinct from 'arbitrator') desc, r.created_at desc limit 200;
end $$;
revoke execute on function public.arb_cases() from public, anon;
grant execute on function public.arb_cases() to authenticated;
