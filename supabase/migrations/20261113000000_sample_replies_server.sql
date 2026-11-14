-- Sample members reply from the server (Rusty, 13 Nov 2026). Safe to run more than once.
-- Before, the member's phone asked for the reply about 3 seconds after sending, so there was no reply if they left the
-- chat or closed the app in that time, and two quick messages got only one reply. Now the send function asks for it
-- itself, and every unanswered message gets its own reply.

-- Called only by the send function (service key): one reply if the sample member has answered fewer messages than were sent.
create or replace function public.sample_reply_to(sender uuid, name text) returns bigint
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare them uuid; c uuid; mine int; said int; total int; who text; reply text; out bigint;
begin
  select p.id into them from public.profiles p where p.username operator(public.=) name::public.citext and p.is_sample;
  c := public.chat_with(sender, them);
  if them is null or c is null or public.blocked_between(sender, them) then return null; end if;
  perform pg_advisory_xact_lock(hashtext(c::text)); -- two replies at once can't both answer the same message
  select count(*) filter (where m.sender = sender), count(*) filter (where m.sender = them) into mine, said
    from public.messages m where m.chat_id = c;
  if said >= mine then return null; end if;
  who := case when exists (select 1 from public.sample_replies r where r.username operator(public.=) name::public.citext) then name else '*' end;
  select count(*) into total from public.sample_replies r where r.username operator(public.=) who::public.citext;
  if total = 0 then return null; end if;
  select r.body into reply from public.sample_replies r where r.username operator(public.=) who::public.citext and r.n = said % total;
  insert into public.messages (chat_id, sender, body) values (c, them, reply) returning id into out;
  return out;
end $$;
revoke execute on function public.sample_reply_to(uuid, text) from public, anon, authenticated;
grant execute on function public.sample_reply_to(uuid, text) to service_role;

-- The app's old way of asking now only reads: it returns the sample member's latest reply if it's the last message,
-- so copies of the app still open on phones don't add a second reply.
create or replace function public.sample_reply(name text)
returns table (id bigint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.created_at from public.profiles p
    join public.messages m on m.chat_id = public.chat_with(auth.uid(), p.id) and m.sender = p.id
  where p.username operator(public.=) name::public.citext and p.is_sample
    and not exists (select 1 from public.messages x where x.chat_id = m.chat_id and (x.created_at, x.id) > (m.created_at, m.id))
  limit 1;
$$;
revoke execute on function public.sample_reply(text) from public, anon;
grant execute on function public.sample_reply(text) to authenticated;

-- Rusty, 14 Nov 2026: sample members' replies are written to what was said (supabase/functions/_shared/samples.ts).
-- sample_say adds that reply, but only if the member's message is still unanswered.
create or replace function public.sample_say(sender uuid, name text, body text) returns bigint
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare them uuid; c uuid; mine int; said int; out bigint;
begin
  if char_length(trim(body)) = 0 or char_length(body) > 1000 then return null; end if;
  select p.id into them from public.profiles p where p.username operator(public.=) name::public.citext and p.is_sample;
  c := public.chat_with(sender, them);
  if them is null or c is null or public.blocked_between(sender, them) then return null; end if;
  perform pg_advisory_xact_lock(hashtext(c::text));
  select count(*) filter (where m.sender = sender), count(*) filter (where m.sender = them) into mine, said
    from public.messages m where m.chat_id = c;
  if said >= mine then return null; end if;
  insert into public.messages (chat_id, sender, body) values (c, them, trim(body)) returning id into out;
  return out;
end $$;
revoke execute on function public.sample_say(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sample_say(uuid, text, text) to service_role;
