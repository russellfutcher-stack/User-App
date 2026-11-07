-- Location (Rusty, 8 Nov 2026). Safe to run more than once.
-- Members can add a city and a country. The country is shown to every member; the city only to the people chosen in
-- "Who sees my city" (default: People I chat with), and only they can find someone by city in Search.
-- This country is separate from the Support page's country (profiles.country), which picks help services.

alter table public.profiles add column if not exists city text check (char_length(city) <= 60);
alter table public.profiles add column if not exists home_country text check (char_length(home_country) <= 40);
alter table public.profiles add column if not exists vis_location text not null default 'matches' check (vis_location in ('everyone', 'matches', 'me'));
grant update (city, home_country, vis_location) on public.profiles to authenticated;

drop function if exists public.find_members();
create or replace function public.find_members()
 returns table(username text, is_peer boolean, wants_peer boolean, region text, active text, stage text, looking text[], byline text, tags text[], pct integer,
               city text, home_country text)
 language sql stable security definer set search_path = '' as $$
  select p.username::text, p.is_peer, coalesce(p.wants_peer, false), p.region, p.active, p.stage, p.looking, p.byline,
         public.visible_tags(p, me.id), public.match_score(me, p),
         case when p.vis_location = 'everyone' or (p.vis_location = 'matches' and public.chat_partners(me.id, p.id)) then p.city end,
         p.home_country
  from public.profiles me join public.profiles p on p.id <> me.id
  where me.id = auth.uid() and p.setup_done and p.searchable
    and not exists (select 1 from public.arbitrators a where a.member = p.id)
    and not exists (select 1 from public.blocks b
                    where (b.blocker = me.id and b.blocked = p.id) or (b.blocker = p.id and b.blocked = me.id));
$$;
revoke execute on function public.find_members() from public, anon;
grant execute on function public.find_members() to authenticated;

-- Made-up cities for the sample members (removed at launch), picked the same way as app/src/data/places.ts.
with places(region, country, towns) as (values
  ('North-west', 'United Kingdom', array['Manchester', 'Liverpool', 'Preston', 'Lancaster']),
  ('North-east', 'United Kingdom', array['Newcastle', 'Sunderland', 'Durham', 'Middlesbrough']),
  ('Midlands', 'United Kingdom', array['Birmingham', 'Nottingham', 'Leicester', 'Derby']),
  ('South-east', 'United Kingdom', array['Brighton', 'Oxford', 'Reading', 'Canterbury']),
  ('South-west', 'United Kingdom', array['Bristol', 'Exeter', 'Plymouth', 'Bath']),
  ('London', 'United Kingdom', array['London']),
  ('Scotland', 'United Kingdom', array['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee']),
  ('Wales', 'United Kingdom', array['Cardiff', 'Swansea', 'Newport']),
  ('Northern Ireland', 'United Kingdom', array['Belfast', 'Derry']),
  ('Ireland', 'Ireland', array['Dublin', 'Cork', 'Galway', 'Limerick']),
  ('Yorkshire', 'United Kingdom', array['Leeds', 'Sheffield', 'York', 'Bradford', 'Hull']),
  ('East of England', 'United Kingdom', array['Norwich', 'Cambridge', 'Ipswich', 'Peterborough']),
  ('Online only', 'United Kingdom', array[]::text[]))
update public.profiles p set home_country = pl.country, vis_location = 'everyone',
       city = case when cardinality(pl.towns) = 0 then null
                   else pl.towns[1 + (select sum(ascii(c)) from regexp_split_to_table(p.username::text, '') c)::int % cardinality(pl.towns)] end
  from places pl, auth.users u
  where pl.region = p.region and u.id = p.id and u.email like '%@samples.user-app.invalid';
