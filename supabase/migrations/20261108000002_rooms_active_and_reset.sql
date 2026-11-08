-- Rusty, 8 Nov 2026. Safe to run more than once.
-- 1. Rooms show how many people were active (opened or posted in the room) in the last 5 minutes.
-- 2. An optional email, used only to send a password reset code. Members read and change only their own; nobody else
--    can see it. Codes are kept as a hash for 15 minutes and only the reset-password function (service key) touches them.

create table if not exists public.room_seen (
  room_id text not null references public.rooms on delete cascade,
  member uuid not null references public.profiles on delete cascade,
  at timestamptz not null default now(),
  primary key (room_id, member));
alter table public.room_seen enable row level security;
revoke all on public.room_seen from anon, authenticated;

create or replace function public.room_seen(room text) returns void language sql security definer set search_path = '' as $$
  insert into public.room_seen (room_id, member)
  select id, auth.uid() from public.rooms where id = room and not deleted and auth.uid() is not null
  on conflict (room_id, member) do update set at = now();
$$;

drop function if exists public.my_rooms();
create or replace function public.my_rooms()
returns table (id text, cat text, name text, descr text, members int, active int, joined boolean, mine boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.cat, r.name::text, r.descr,
         r.base_members + (select count(*)::int from public.room_members m where m.room_id = r.id),
         (select count(*)::int from (
            select s.member from public.room_seen s where s.room_id = r.id and s.at > now() - interval '5 minutes'
            union select x.author from public.room_posts x where x.room_id = r.id and x.author is not null and x.created_at > now() - interval '5 minutes') a),
         exists (select 1 from public.room_members m where m.room_id = r.id and m.member = auth.uid()),
         r.created_by is not distinct from auth.uid() and r.created_by is not null
  from public.rooms r where not r.deleted
  order by array_position(array['r1','r5','r6','r9','r10','r3','r4','r11','r12','r8','r7','r13','r14','r15'], r.id) nulls last, r.created_at;
$$;
do $do$ declare f text; begin
  foreach f in array array['room_seen(text)', 'my_rooms()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $do$;
-- Old visits aren't needed.
delete from public.room_seen where at < now() - interval '1 day';

create table if not exists public.recovery_emails (
  member uuid primary key references auth.users on delete cascade default auth.uid(),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_at timestamptz not null default now());
alter table public.recovery_emails enable row level security;
revoke all on public.recovery_emails from anon, authenticated;
grant select, insert, update, delete on public.recovery_emails to authenticated;
drop policy if exists "own email" on public.recovery_emails;
create policy "own email" on public.recovery_emails for all to authenticated
  using (member = (select auth.uid())) with check (member = (select auth.uid()));

create table if not exists public.reset_codes (
  member uuid primary key references auth.users on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  sent_at timestamptz not null default now(),
  sends_today int not null default 1);
alter table public.reset_codes enable row level security;
revoke all on public.reset_codes from anon, authenticated;
