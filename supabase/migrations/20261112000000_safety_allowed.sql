-- Allowed words (Rusty, 12 Nov 2026). Safe to run more than once.
-- public.safety_allowed is the owner's list of words the safety check allows. A message is never blocked just for
-- containing one: the quick word filter ignores them, and the Claude check is told they are allowed.
-- 'link' means web links may be shared. App names mean members may name those apps and share their handles there.
-- Only the server functions read it (with the service key). Rusty edits it in Supabase: Table Editor, safety_allowed.
create table if not exists public.safety_allowed (
  term public.citext primary key check (char_length(term) between 1 and 40),
  note text,
  created_at timestamptz not null default now());
alter table public.safety_allowed enable row level security;
revoke all on public.safety_allowed from anon, authenticated;

insert into public.safety_allowed (term, note) values
  ('cost', 'Rusty, 12 Nov 2026'), ('price', 'Rusty, 12 Nov 2026'), ('sell', 'Rusty, 12 Nov 2026'),
  ('sold', 'Rusty, 12 Nov 2026'), ('buy', 'Rusty, 12 Nov 2026'), ('link', 'Web links. Rusty, 12 Nov 2026'),
  ('whatsapp', 'App name. Rusty, 12 Nov 2026'), ('snapchat', 'App name. Rusty, 12 Nov 2026'), ('telegram', 'App name. Rusty, 12 Nov 2026'),
  ('wickr', 'App name. Rusty, 12 Nov 2026'), ('kik', 'App name. Rusty, 12 Nov 2026'), ('instagram', 'App name. Rusty, 12 Nov 2026'),
  ('insta', 'App name. Rusty, 12 Nov 2026'), ('signal', 'App name. Rusty, 12 Nov 2026'), ('facebook', 'App name. Rusty, 12 Nov 2026'),
  ('messenger', 'App name. Rusty, 12 Nov 2026'), ('tiktok', 'App name. Rusty, 12 Nov 2026')
on conflict (term) do nothing;
