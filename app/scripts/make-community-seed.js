// Writes supabase/seed/sample_community.sql from src/data/community.ts: the sample members' chat replies and the
// sample posts in the 14 built-in rooms. Run from app/ after sample_members.sql: node scripts/make-community-seed.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/data/community.ts'), 'utf8');
const grab = re => JSON.parse(src.match(re)[1]);
const generic = grab(/GENERIC_REPLIES: string\[\] = (\[.*\]);/);
const replies = Object.fromEntries([...src.matchAll(/^  (\w+): (\[.*\]),$/gm)].map(m => [m[1], JSON.parse(m[2])]));
const rooms = [...src.matchAll(/^  (\{"id":"r\d+".*\}),$/gm)].map(m => JSON.parse(m[1]));
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const rep = [...Object.entries(replies).flatMap(([u, l]) => l.map((t, i) => `(${q(u)}, ${i}, ${q(t)})`)), ...generic.map((t, i) => `('*', ${i}, ${q(t)})`)];
const posts = rooms.flatMap(r => r.seed.map(([who, t], i) => `(${q(r.id)}, ${q(who)}, ${q(t)}, ${r.seed.length - i})`));
const sql = `-- Sample chat replies and room posts for trying chats and rooms on the real server.
-- Made by app/scripts/make-community-seed.js from app/src/data/community.ts. Run after sample_members.sql.
-- Safe to run more than once. Removing the sample members (see sample_members.sql) removes their posts too;
-- then also run: delete from public.sample_replies; delete from public.room_posts where author is null and room_id like 'r%';

insert into public.sample_replies (username, n, body) values
  ${rep.join(',\n  ')}
on conflict (username, n) do update set body = excluded.body;

-- Each built-in room's sample posts, a few minutes apart, skipping any already there.
insert into public.room_posts (room_id, author, body, created_at)
select s.room, p.id, s.body, now() - make_interval(mins => s.ago * 7)
from (values
  ${posts.join(',\n  ')}
) s (room, who, body, ago)
left join public.profiles p on p.username = s.who::public.citext and p.is_sample
where (p.id is not null or s.who = 'User')
  and not exists (select 1 from public.room_posts x where x.room_id = s.room and x.body = s.body and x.author is not distinct from p.id);
`;
fs.writeFileSync(path.join(__dirname, '../../supabase/seed/sample_community.sql'), sql);
console.log('wrote', rep.length, 'replies and', posts.length, 'room posts');
