// Writes supabase/seed/sample_members.sql from src/data/people.ts. Run from app/: node scripts/make-sample-seed.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/data/people.ts'), 'utf8');
const people = src.split('\n').filter(l => l.startsWith('  {')).map(l => JSON.parse(l.trim().replace(/,$/, '')));
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const arr = a => `array[${a.map(q).join(',')}]::text[]`;
const rows = people.map(p => `  (${q(p.username)}, ${p.isPeer}, ${p.wantsPeer}, ${q(p.region)}, ${q(p.active)}, ${q(p.stage)}, ${arr(p.tags)}, ${arr(p.looking)}, ${q(p.byline)})`);
const sql = `-- The ${people.length} fictional sample members, for trying matching and Search on the real server.
-- Made by app/scripts/make-sample-seed.js from app/src/data/people.ts. Safe to run more than once.
-- Each has a login with no password, so nobody can sign in as them. Their emails end in @samples.user-app.invalid.
--
-- To remove them all before launch (step 6), run:
--   delete from auth.users where email like '%@samples.user-app.invalid';

with s (username, is_peer, wants_peer, region, active, stage, tags, looking, byline) as (values
${rows.join(',\n')}
), added as (
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         lower(s.username) || '@samples.user-app.invalid', '{"provider":"sample"}', jsonb_build_object('username', s.username),
         now(), now(), '', '', '', ''
  from s where not exists (select 1 from public.profiles p where p.username = s.username::public.citext)
  returning email
)
select count(*) as sample_members_added from added;

-- The new logins made empty profiles; fill them in. Samples share everything, so all their tags show.
update public.profiles p set is_sample = true, is_peer = s.is_peer, wants_peer = s.wants_peer, region = s.region, active = s.active,
  stage = s.stage, tags = s.tags, looking = s.looking, byline = s.byline, setup_done = true,
  vis_interests = 'everyone', vis_mh = 'everyone', vis_subs = 'everyone'
from (values
${rows.join(',\n')}
) s (username, is_peer, wants_peer, region, active, stage, tags, looking, byline)
where p.username = s.username::public.citext
  and p.id in (select id from auth.users where email like '%@samples.user-app.invalid');
`;
fs.writeFileSync(path.join(__dirname, '../../supabase/seed/sample_members.sql'), sql);
console.log('wrote', people.length, 'sample members');
