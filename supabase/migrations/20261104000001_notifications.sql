-- Phase 1, step 6: notifications. Safe to run more than once.
-- Agreed with Rusty, 4 Nov 2026: a neutral alert for a new chat message and when a review is decided, never with names or
-- message text. Members turn it on per device on the Me page; it's off until they do. Mute in a chat silences it for 8 hours.
-- Sending is done by supabase/functions/_shared/push.ts (Web Push). The signing key is made on the server and never leaves it.

-- Each device that turned notifications on. Only the functions read these.
create table if not exists public.push_subs (
  endpoint text primary key,
  member uuid not null references public.profiles on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_member on public.push_subs (member);
-- The Web Push signing keys (one row). Made by the push function the first time it's needed.
create table if not exists public.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null, private_key text not null,
  created_at timestamptz not null default now()
);
do $do$ declare t text; begin
  foreach t in array array['push_subs', 'push_keys'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $do$;

-- Mute a chat for 8 hours (Safety & options in a chat).
alter table public.chat_state add column if not exists muted_until timestamptz;
create or replace function public.mute_chat(name text) returns timestamptz language sql security definer set search_path = '' as $$
  update public.chat_state set muted_until = now() + interval '8 hours'
  where member = auth.uid() and chat_id = public.chat_with(auth.uid(), public.member_id(name))
  returning muted_until;
$$;
revoke execute on function public.mute_chat(text) from public, anon;
grant execute on function public.mute_chat(text) to authenticated;
