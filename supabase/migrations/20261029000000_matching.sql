-- Phase 1, step 2: matching and Search.
-- Members never read each other's profiles directly. find_members() returns, for each member you can match with,
-- only the tags they let you see, and a match score the server works out from all their tags
-- (so "Only me (still used for matching)" holds, and hidden tags never leave the server).
-- The score follows app/src/lib/match.ts; keep the two in step.

-- Region and last-active are shown for the sample members only. Members can't set these (see the grants in step 1).
alter table public.profiles
  add column is_sample boolean not null default false,
  add column region text not null default '',
  add column active text not null default '';

-- People who chat with each other. Chats arrive in step 3, which replaces this function.
create function public.chat_partners(a uuid, b uuid) returns boolean language sql stable set search_path = '' as $$
  select false;
$$;

-- Tags by choice: I = interests, D = mental health, M, S and O = drug use.
create function public.tags_in(tags text[], kinds text[]) returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(t order by n), '{}') from unnest(tags) with ordinality as u(t, n) where left(t, 1) = any(kinds);
$$;

-- The tags of p that viewer may see, following p's privacy settings.
create function public.visible_tags(p public.profiles, viewer uuid) returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(t order by n), '{}') from unnest(p.tags) with ordinality as u(t, n)
  where case case left(t, 1) when 'I' then p.vis_interests when 'D' then p.vis_mh else p.vis_subs end
          when 'everyone' then true
          when 'matches' then public.chat_partners(viewer, p.id)
          else false end;
$$;

create function public.jac(a text[], b text[]) returns double precision language sql immutable set search_path = '' as $$
  select case when x + y = 0 then null else i::double precision / (x + y - i) end
  from (select cardinality(array(select distinct unnest(a))) x, cardinality(array(select distinct unnest(b))) y,
               (select count(distinct t) from unnest(a) t where t = any(b)) i) s;
$$;

create function public.stage_compat(a text, b text) returns double precision language sql immutable set search_path = '' as $$
  select case
    when a = 'na' or b = 'na' then 0.5
    when a = 'help' or b = 'help' then case when a = b then 0.6 else 0.85 end -- helpers suit anyone who wants support
    when a = 'support' or b = 'support' then case when a = b then 1 else 0.5 end
    else greatest(0, 1 - abs(array_position(o, a) - array_position(o, b)) * 0.15::double precision) end
  from (select array['using','thinking','cutting','quit','early3','early6','early','long'] o) s;
$$;

-- Can someone offering `offer` meet `want`? Mentor and mentee complement each other.
create function public.meets(want text, offer text[]) returns boolean language sql immutable set search_path = '' as $$
  select want = any(offer) or coalesce(case want
    when 'mentor' then array['mentoring'] when 'mentoring' then array['mentor']
    when 'listen' then array['chat','checkin','night'] when 'chat' then array['listen'] end && offer, false);
$$;

create function public.look_fit(mine text[], theirs text[]) returns double precision language sql immutable set search_path = '' as $$
  select case when cardinality(mine) = 0 then 0
    else (select count(*) from unnest(mine) l where public.meets(l, theirs))::double precision / cardinality(mine) end;
$$;

-- Interests 35%, mental health 20%, drug use 20%, stage 10%, looking for 15%, plus the peer support boost. At most 99.
create function public.match_score(me public.profiles, p public.profiles) returns int language sql stable set search_path = '' as $$
  select least(99, floor(coalesce(sum(wt * v) / nullif(sum(wt), 0), 0) * 100
      + ((case when coalesce(me.wants_peer, false) and p.is_peer then 0.12 else 0 end)::double precision
       + (case when me.is_peer and coalesce(p.wants_peer, false) then 0.08 else 0 end)::double precision) * 100 + 0.5))::int
  from (values
    (1, 0.35::double precision, public.jac(public.tags_in(me.tags, '{I}'), public.tags_in(p.tags, '{I}'))),
    (2, 0.20, public.jac(public.tags_in(me.tags, '{D}'), public.tags_in(p.tags, '{D}'))),
    (3, 0.20, public.jac(public.tags_in(me.tags, '{M,S,O}'), public.tags_in(p.tags, '{M,S,O}'))),
    (4, 0.10, public.stage_compat(me.stage, p.stage)),
    (5, 0.15, case when cardinality(me.looking) > 0 then public.look_fit(me.looking, p.looking) end)
  ) x(n, wt, v) where v is not null;
$$;

-- Everyone you can match with: set up, shown in Search, and not blocked either way.
create function public.find_members()
returns table (username text, is_peer boolean, wants_peer boolean, region text, active text, stage text,
               looking text[], byline text, tags text[], pct int)
language sql stable security definer set search_path = '' as $$
  select p.username::text, p.is_peer, coalesce(p.wants_peer, false), p.region, p.active, p.stage, p.looking, p.byline,
         public.visible_tags(p, me.id), public.match_score(me, p)
  from public.profiles me join public.profiles p on p.id <> me.id
  where me.id = auth.uid() and p.setup_done and p.searchable
    and not exists (select 1 from public.blocks b
                    where (b.blocker = me.id and b.blocked = p.id) or (b.blocker = p.id and b.blocked = me.id));
$$;
revoke execute on function public.find_members() from public;
grant execute on function public.find_members() to authenticated;

create function public.block(name text) returns void language sql security definer set search_path = '' as $$
  insert into public.blocks (blocker, blocked)
  select auth.uid(), id from public.profiles where username = name::public.citext and id <> auth.uid()
  on conflict do nothing;
$$;
revoke execute on function public.block(text) from public;
grant execute on function public.block(text) to authenticated;

-- The helpers are only used inside find_members().
revoke execute on function public.chat_partners(uuid, uuid), public.tags_in(text[], text[]), public.visible_tags(public.profiles, uuid),
  public.jac(text[], text[]), public.stage_compat(text, text), public.meets(text, text[]), public.look_fit(text[], text[]),
  public.match_score(public.profiles, public.profiles) from public, anon, authenticated;
