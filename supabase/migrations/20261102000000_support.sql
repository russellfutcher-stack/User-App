-- Phase 1, step 5: the Support page. Safe to run more than once.
-- The country a member chooses on the Support page is remembered for its help services. It also counts towards
-- the arbitrator's "members by country" figure. User doesn't track location: this is only what members choose.
alter table public.profiles add column if not exists country text check (country is null or char_length(country) <= 40);
grant update (country) on public.profiles to authenticated;
