// Runs SQL files on the Supabase project through the Supabase Management API, so Max can apply migrations himself.
// Needs SUPABASE_ACCESS_TOKEN (a personal access token, set as an environment variable, never in the code) and
// network access to api.supabase.com. The project comes from EXPO_PUBLIC_SUPABASE_URL.
//   node scripts/supabase-sql.js ../supabase/migrations/20261030000000_chats_rooms.sql [more files...]
//   node scripts/supabase-sql.js -e "select count(*) from public.profiles"
const fs = require('fs');
const token = process.env.SUPABASE_ACCESS_TOKEN, url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ref = (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!token || !ref) { console.error('Set SUPABASE_ACCESS_TOKEN and EXPO_PUBLIC_SUPABASE_URL first.'); process.exit(2); }
const args = process.argv.slice(2);
const jobs = args[0] === '-e' ? [['(inline)', args.slice(1).join(' ')]] : args.map(f => [f, fs.readFileSync(f, 'utf8')]);
(async () => {
  for (const [name, query] of jobs) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
    });
    const body = await r.text();
    if (!r.ok) { console.error(`FAILED ${name}: ${r.status} ${body.slice(0, 500)}`); process.exit(1); }
    console.log(`ok ${name}${args[0] === '-e' ? '\n' + body : ''}`);
  }
})();
