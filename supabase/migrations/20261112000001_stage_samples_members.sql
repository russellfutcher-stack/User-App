-- Rusty, 12 Nov 2026. Safe to run more than once.
-- 1. A new stage: Early recovery (under 1 month).
-- 2. Sample members stay after launch, each marked "Sample member" in the app (find_members says which they are),
--    until there are 500 real members. Then the arbitrator is emailed once and the dashboard says to remove them.
-- 3. Dashboard figures: live members, members who deleted their account, and new members this month.

-- ---------- 1. The new stage ----------
alter table public.profiles drop constraint if exists profiles_stage_check;
alter table public.profiles add constraint profiles_stage_check
  check (stage in ('using','thinking','cutting','quit','early1','early3','early6','early','long','help','support','na'));
-- early1 sits half a step between 'quit' and 'early3', so nobody's existing match score changes.
create or replace function public.stage_compat(a text, b text) returns double precision language sql immutable set search_path = '' as $$
  select case
    when a = 'na' or b = 'na' then 0.5
    when a = 'help' or b = 'help' then case when a = b then 0.6 else 0.85 end -- helpers suit anyone who wants support
    when a = 'support' or b = 'support' then case when a = b then 1 else 0.5 end
    else greatest(0, 1 - abs(pa - pb) * 0.15::double precision) end
  from (select case when a = 'early1' then 4.5 else array_position(o, a) end pa, case when b = 'early1' then 4.5 else array_position(o, b) end pb
        from (select array['using','thinking','cutting','quit','early3','early6','early','long'] o) s) p;
$$;

-- ---------- 2. Sample members are marked ----------
drop function if exists public.find_members();
create or replace function public.find_members()
 returns table(username text, is_peer boolean, wants_peer boolean, region text, active text, stage text, looking text[], byline text, tags text[], pct integer,
               city text, home_country text, sample boolean)
 language sql stable security definer set search_path = '' as $$
  select p.username::text, p.is_peer, coalesce(p.wants_peer, false), p.region, p.active, p.stage, p.looking, p.byline,
         public.visible_tags(p, me.id), public.match_score(me, p),
         case when p.vis_location = 'everyone' or (p.vis_location = 'matches' and public.chat_partners(me.id, p.id)) then p.city end,
         p.home_country,
         exists (select 1 from auth.users u where u.id = p.id and u.email like '%@samples.user-app.invalid')
  from public.profiles me join public.profiles p on p.id <> me.id
  where me.id = auth.uid() and p.setup_done and p.searchable
    and not exists (select 1 from public.arbitrators a where a.member = p.id)
    and not exists (select 1 from public.blocks b
                    where (b.blocker = me.id and b.blocked = p.id) or (b.blocker = p.id and b.blocked = me.id));
$$;
revoke execute on function public.find_members() from public, anon;
grant execute on function public.find_members() to authenticated;

-- ---------- 3. Members who deleted their account ----------
-- Only a date is kept, nothing about who they were. Accounts removed by the arbitrator or the age check aren't counted,
-- and nor are the throwaway accounts the live checks make (zz... with a number).
create table if not exists public.deleted_accounts (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table public.deleted_accounts enable row level security;
revoke all on public.deleted_accounts from anon, authenticated;

create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.real_members() m where m.id = auth.uid() and m.username::text !~* '^zz[a-z]+[0-9]+$') then
    insert into public.deleted_accounts default values;
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Dashboard: member figures ----------
create or replace function public.arb_members() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare month_start timestamptz := date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney';
        live int; samples int;
begin
  if not public.am_arbitrator() then raise exception 'not an arbitrator'; end if;
  select count(*) into live from public.real_members();
  select count(*) into samples from auth.users where email like '%@samples.user-app.invalid';
  return jsonb_build_object(
    'liveMembers', live,
    'deletedAccounts', (select count(*) from public.deleted_accounts),
    'newThisMonth', (select count(*) from public.real_members() where created_at >= month_start),
    'samples', samples,
    'removeSamples', live >= 500 and samples > 0);
end $$;
revoke execute on function public.arb_members() from public, anon;
grant execute on function public.arb_members() to authenticated;

-- ---------- The 500-member reminder ----------
-- Checked once a day by the `milestones` function, which emails the arbitrator the first time it's true.
create table if not exists public.milestones (name text primary key, at timestamptz not null default now());
alter table public.milestones enable row level security;
revoke all on public.milestones from anon, authenticated;
grant all on public.milestones to service_role;

create or replace function public.milestone_due() returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.real_members()) < 500
     or not exists (select 1 from auth.users where email like '%@samples.user-app.invalid')
     or exists (select 1 from public.milestones where name = '500 real members') then return false; end if;
  insert into public.milestones (name) values ('500 real members') on conflict do nothing;
  return found;
end $$;
revoke execute on function public.milestone_due() from public, anon, authenticated;
grant execute on function public.milestone_due() to service_role;

insert into public.jobs (name, url) select 'milestones', replace(url, 'nightly-recheck', 'milestones') from public.jobs where name = 'nightly-recheck'
  on conflict (name) do nothing;
select cron.unschedule(jobid) from cron.job where jobname = 'milestones';
select cron.schedule('milestones', '37 22 * * *', 'select public.run_job(''milestones'')'); -- about 9:37am in Sydney
