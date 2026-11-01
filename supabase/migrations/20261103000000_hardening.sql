-- Phase 1, step 6: security review fixes. Safe to run more than once. See docs/SECURITY-REVIEW.md.
-- 1. Signed-out visitors get nothing from the tables, and members only the reads the app uses.
--    (Row rules already limit what members see; these remove permissions nobody needs, such as emptying a table.)
do $do$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, trigger, references on public.%I from authenticated', t);
  end loop;
end $do$;
-- 2. Member functions can't be called signed out. Only username_taken is for signed-out visitors (sign-up checks it).
do $do$ declare f text; begin
  foreach f in array array['block(text)', 'unblock(text)', 'my_blocked()', 'find_members()', 'delete_my_account()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- Runs only as a trigger when an account is made.
  execute 'revoke execute on function public.handle_new_user() from public, anon, authenticated';
end $do$;
-- 3. New functions are no longer callable signed out unless a migration grants it.
alter default privileges in schema public revoke execute on functions from anon, public;

-- 4. Privacy fix. chat_partners compared the chats table's own columns with themselves (its arguments are also called a and b),
--    so it said "yes" for anyone once any two members had chatted, and tags set to "People I chat with" showed to everyone.
create or replace function public.chat_partners(a uuid, b uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.chats c where c.a = least($1, $2) and c.b = greatest($1, $2)
    and exists (select 1 from public.messages m where m.chat_id = c.id and m.sender = c.a)
    and exists (select 1 from public.messages m where m.chat_id = c.id and m.sender = c.b));
$$;
revoke execute on function public.chat_partners(uuid, uuid) from public, anon, authenticated;
