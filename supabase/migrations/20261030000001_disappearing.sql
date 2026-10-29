-- Phase 1, step 3: disappearing messages. Safe to run more than once.
-- The Me page says: "Chat messages are deleted for both of you 7 days after they are sent, from the app and our servers."
-- So in any chat where either person has it on, messages older than 7 days are deleted, every hour, by pg_cron.
create extension if not exists pg_cron;

create or replace function public.delete_disappearing() returns int language sql security definer set search_path = '' as $$
  with gone as (
    delete from public.messages m using public.chats c
    where c.id = m.chat_id and m.created_at < now() - interval '7 days'
      and exists (select 1 from public.profiles p where p.id in (c.a, c.b) and p.disappearing)
    returning 1)
  select count(*)::int from gone;
$$;
revoke execute on function public.delete_disappearing() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'delete-disappearing-messages';
select cron.schedule('delete-disappearing-messages', '17 * * * *', 'select public.delete_disappearing()');
