-- Phase 1, step 4 (part 3): the check-in after a danger report, the age check, and the nightly re-check. Safe to run more than once.
-- See docs/AI-agents-spec.md, sections 3.6 and 5.4. Agreed with Rusty, 29 Oct 2026:
-- - Danger report: next time the member opens the app, the Help sheet opens with a short, kind note. It never says who reported them.
-- - Under 18 (a report, or the safety check spotting it): the account is paused until the member ticks "I am 18 or older".
--   Ticking it is recorded; a second sign after that pauses the account for review. Not confirmed in 7 days: the account is removed.
create extension if not exists pg_net;

alter table public.profiles
  add column if not exists checkin_at timestamptz,       -- a check-in is waiting to be shown
  add column if not exists age_check_at timestamptz,     -- paused until the member confirms they are 18 or older
  add column if not exists age_confirmed_at timestamptz; -- when they last confirmed

alter table public.moderation drop constraint if exists moderation_kind_check;
alter table public.moderation add constraint moderation_kind_check
  check (kind in ('message', 'post', 'room_request', 'report', 'review', 'age', 'checkin', 'recheck'));

-- ---------- Danger: a check-in ----------
create or replace function public.flag_danger(m uuid) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set checkin_at = now() where id = m;
  insert into public.moderation (member, kind, action, reason) values (m, 'checkin', 'check-in sent', 'A report said they seem to be in danger.');
$$;

-- ---------- Under 18: the age check ----------
-- Returns 'ask' (paused until they confirm) or 'review' (they had already confirmed, so the account is paused and reviewed).
-- After confirming, only their own words count as a second sign; another report is logged and reviewed but doesn't pause them,
-- so members can't pause someone just by reporting them twice. Returns 'noted' then.
create or replace function public.flag_under_18(m uuid, why text) returns text
language plpgsql security definer set search_path = '' as $$
declare confirmed timestamptz;
begin
  select age_confirmed_at into confirmed from public.profiles where id = m;
  if confirmed is not null and why = 'a report' then
    insert into public.moderation (member, kind, action, reason) values (m, 'age', 'reported again after confirming', why);
    return 'noted';
  end if;
  if confirmed is not null then
    update public.profiles set suspended_until = 'infinity', age_check_at = null where id = m;
    if not exists (select 1 from public.reviews where member = m and topic = 'Account removal proposed' and status = 'Being reviewed') then
      insert into public.reviews (member, topic, body, auto, urgent, due_at)
        values (m, 'Account removal proposed', 'A new sign of being under 18 (' || why || ') after confirming their age.', true, true, now() + interval '24 hours');
    end if;
    insert into public.moderation (member, kind, action, reason) values (m, 'age', 'paused for review', why);
    return 'review';
  end if;
  update public.profiles set age_check_at = coalesce(age_check_at, now()) where id = m;
  insert into public.moderation (member, kind, action, reason) values (m, 'age', 'asked to confirm', why);
  return 'ask';
end $$;

-- What the signed-in member needs to see when they open the app.
create or replace function public.my_notices() returns table (checkin boolean, age_check text)
language sql stable security definer set search_path = '' as $$
  select p.checkin_at is not null,
         case when p.age_check_at is not null then 'ask'
              when p.suspended_until = 'infinity' and p.age_confirmed_at is not null
                   and exists (select 1 from public.reviews r where r.member = p.id and r.topic = 'Account removal proposed' and r.status = 'Being reviewed') then 'review' end
  from public.profiles p where p.id = auth.uid();
$$;
create or replace function public.seen_checkin() returns void language sql security definer set search_path = '' as $$
  update public.profiles set checkin_at = null where id = auth.uid();
$$;
create or replace function public.confirm_age() returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set age_check_at = null, age_confirmed_at = now() where id = auth.uid() and age_check_at is not null;
  if not found then return false; end if;
  insert into public.moderation (member, kind, action) values (auth.uid(), 'age', 'confirmed 18 or over');
  return true;
end $$;

-- Accounts not confirmed within 7 days are removed, with everything in them. Daily, by pg_cron.
create or replace function public.remove_unconfirmed() returns int language sql security definer set search_path = '' as $$
  with gone as (delete from auth.users u using public.profiles p
                where p.id = u.id and p.age_check_at < now() - interval '7 days' returning 1)
  select count(*)::int from gone;
$$;
select cron.unschedule(jobid) from cron.job where jobname = 'remove-unconfirmed-ages';
select cron.schedule('remove-unconfirmed-ages', '41 2 * * *', 'select public.remove_unconfirmed()');

-- ---------- The nightly re-check (supabase/functions/nightly-recheck) ----------
-- Each night a sample of the day's delivered messages and posts is checked again, through the Batch API at half price.
-- The results come back within a day and are collected the next night. Misses are logged for the arbitrator
-- and the test set (moderation, kind 'recheck', with the text kept). Nobody is punished automatically.
create table if not exists public.rechecks (
  id bigint generated always as identity primary key,
  batch_id text not null,
  items jsonb not null,             -- [{ id, kind, ref }]: which message or post each request was (ids only, never the text)
  checked int, missed int,
  created_at timestamptz not null default now(), collected_at timestamptz
);
-- The function's address and a random key, so only this database's scheduler can start it. Never leaves the database.
create table if not exists public.jobs (name text primary key, url text not null, token text not null default encode(extensions.gen_random_bytes(24), 'hex'));
do $do$ declare t text; begin
  foreach t in array array['rechecks', 'jobs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $do$;

-- Today's delivered messages and posts, a random sample. Only the text and where it was: never who sent it.
create or replace function public.recheck_sample(n int) returns table (kind text, ref bigint, body text, place text)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'message', m.id, m.body, 'a one-to-one chat' from public.messages m where m.created_at > now() - interval '1 day'
    union all
    select 'post', p.id, p.body, 'a group room called "' || r.name || '"' from public.room_posts p join public.rooms r on r.id = p.room_id
      where p.created_at > now() - interval '1 day' and p.author is not null
  ) x order by random() limit n;
$$;

-- A sampled message's text, and whether a miss may keep it: not from a chat with disappearing messages on.
create or replace function public.recheck_body(k text, r bigint) returns table (body text, keep boolean)
language sql stable security definer set search_path = '' as $$
  select m.body, not exists (select 1 from public.chats c join public.profiles p on p.id in (c.a, c.b) where c.id = m.chat_id and p.disappearing)
    from public.messages m where k = 'message' and m.id = r
  union all
  select p.body, true from public.room_posts p where k = 'post' and p.id = r;
$$;

create or replace function public.run_job(job text) returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(url := j.url, headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-token', j.token), body := '{}'::jsonb, timeout_milliseconds := 60000)
  from public.jobs j where j.name = job;
$$;
select cron.unschedule(jobid) from cron.job where jobname = 'nightly-recheck';
select cron.schedule('nightly-recheck', '23 15 * * *', 'select public.run_job(''nightly-recheck'')'); -- 2:23am in Sydney (summer time)

-- ---------- Who may call what ----------
do $do$ declare f text; begin
  foreach f in array array['flag_danger(uuid)', 'flag_under_18(uuid, text)', 'remove_unconfirmed()', 'recheck_sample(int)', 'recheck_body(text, bigint)', 'run_job(text)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['my_notices()', 'seen_checkin()', 'confirm_age()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $do$;

-- After running this file, register the function's address once (the key is made automatically):
--   insert into public.jobs (name, url) values ('nightly-recheck', 'https://<project ref>.supabase.co/functions/v1/nightly-recheck') on conflict (name) do nothing;
