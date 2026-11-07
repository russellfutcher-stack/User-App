-- Phase 1, step 6: how long text is kept in the safety log. Safe to run more than once.
-- Rusty, 4 Nov 2026: blocked messages are kept for 30 days. After that the text is deleted every night; the record that
-- something was blocked, and why, stays without it. The same goes for misses found by the nightly re-check and room requests.
create or replace function public.forget_old_text() returns int language sql security definer set search_path = '' as $$
  with gone as (update public.moderation set body = null
                where body is not null and created_at < now() - interval '30 days' returning 1)
  select count(*)::int from gone;
$$;
revoke execute on function public.forget_old_text() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'forget-old-text';
select cron.schedule('forget-old-text', '53 3 * * *', 'select public.forget_old_text()');
