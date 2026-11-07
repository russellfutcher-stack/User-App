-- Arbitrators are never shown as members to match with, even if their account has a profile. Safe to run more than once.
create or replace function public.find_members()
 returns table(username text, is_peer boolean, wants_peer boolean, region text, active text, stage text, looking text[], byline text, tags text[], pct integer)
 language sql stable security definer set search_path = '' as $$
  select p.username::text, p.is_peer, coalesce(p.wants_peer, false), p.region, p.active, p.stage, p.looking, p.byline,
         public.visible_tags(p, me.id), public.match_score(me, p)
  from public.profiles me join public.profiles p on p.id <> me.id
  where me.id = auth.uid() and p.setup_done and p.searchable
    and not exists (select 1 from public.arbitrators a where a.member = p.id)
    and not exists (select 1 from public.blocks b
                    where (b.blocker = me.id and b.blocked = p.id) or (b.blocker = p.id and b.blocked = me.id));
$$;
revoke execute on function public.find_members() from public, anon;
grant execute on function public.find_members() to authenticated;
