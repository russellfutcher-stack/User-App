-- Phase 1, step 1: accounts and profiles.
-- Members sign up with a username and password only. Supabase Auth needs an email,
-- so the app makes a placeholder one from the username (see app/src/backend/supabase.ts).
-- In the Supabase dashboard, turn off "Confirm email" so no email is ever sent.

create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  byline text not null default '' check (char_length(byline) <= 240),
  stage text not null default 'na' check (stage in ('using','thinking','cutting','quit','early3','early6','early','long','help','support','na')),
  looking text[] not null default '{chat}',
  wants_peer boolean,
  is_peer boolean not null default false,
  tags text[] not null default '{}' check (array_to_string(tags, ',') ~ '^([IDMSO][0-9]{2}(,|$))*$'),
  -- Privacy defaults: drug use and mental health are only shown to people you chat with.
  vis_interests text not null default 'everyone' check (vis_interests in ('everyone','matches','me')),
  vis_mh text not null default 'matches' check (vis_mh in ('everyone','matches','me')),
  vis_subs text not null default 'matches' check (vis_subs in ('everyone','matches','me')),
  searchable boolean not null default true,
  disappearing boolean not null default false,
  app_lock boolean not null default false,
  setup_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- For now members can only see and change their own profile.
-- Step 2 adds what other members may see, following each person's privacy settings.
create policy "Read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Members can't change their id or username, or insert or delete rows directly.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (byline, stage, looking, wants_peer, is_peer, tags, vis_interests, vis_mh, vis_subs,
              searchable, disappearing, app_lock, setup_done) on public.profiles to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- A profile row is made when the account is created.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Sign-up checks whether a username is free before creating the account.
create function public.username_taken(name text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where username operator(public.=) name::public.citext);
$$;
revoke execute on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;

-- Blocking (the Block button arrives with chats in step 3; the Me page lists and unblocks).
create table public.blocks (
  blocker uuid not null references public.profiles on delete cascade,
  blocked uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "Read own blocks" on public.blocks for select to authenticated using (blocker = (select auth.uid()));
create policy "Add own blocks" on public.blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy "Remove own blocks" on public.blocks for delete to authenticated using (blocker = (select auth.uid()));
revoke update on public.blocks from anon, authenticated;

create function public.my_blocked() returns table (username text) language sql stable security definer set search_path = '' as $$
  select p.username::text from public.blocks b join public.profiles p on p.id = b.blocked
  where b.blocker = auth.uid() order by b.created_at;
$$;
revoke execute on function public.my_blocked() from public;
grant execute on function public.my_blocked() to authenticated;

create function public.unblock(name text) returns void language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker = auth.uid()
    and blocked = (select id from public.profiles where username operator(public.=) name::public.citext);
$$;
revoke execute on function public.unblock(text) from public;
grant execute on function public.unblock(text) to authenticated;

-- Delete account: removes the login and, through the foreign keys, everything else.
create function public.delete_my_account() returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
