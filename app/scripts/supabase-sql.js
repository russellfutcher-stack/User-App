// Runs SQL files on the Supabase project through the Supabase Management API, so Max can apply migrations himself.
// Needs SUPABASE_ACCESS_TOKEN (a personal access token, set as an environment variable, never in the code) and
// network access to api.supabase.com. The project comes from EXPO_PUBLIC_SUPABASE_URL.
//   node scripts/supabase-sql.js ../supabase/migrations/20261030000000_chats_rooms.sql [more files...]
//   node scripts/supabase-sql.js -e "select count(*) from public.profiles"
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const token = process.env.SUPABASE_ACCESS_TOKEN, url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ref = (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!token || !ref) { console.error('Set SUPABASE_ACCESS_TOKEN and EXPO_PUBLIC_SUPABASE_URL first.'); process.exit(2); }
const args = process.argv.slice(2);
const jobs = args[0] === '-e' ? [['(inline)', args.slice(1).join(' ')]] : args.map(f => [f, fs.readFileSync(f, 'utf8')]);
(async () => {
  for (const [name, query] of jobs) {
    // curl goes through the session's network proxy. The token is passed on stdin, so it never shows in a process list.
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sql-')), 'body.json');
    fs.writeFileSync(file, JSON.stringify({ query }));
    const r = spawnSync('curl', ['-sS', '-X', 'POST', `https://api.supabase.com/v1/projects/${ref}/database/query`, '-H', '@-',
      '-H', 'Content-Type: application/json', '--data-binary', '@' + file, '-w', '\n%{http_code}'], { input: `Authorization: Bearer ${token}\n`, encoding: 'utf8' });
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
    const out = (r.stdout || '').trimEnd(), status = +out.slice(out.lastIndexOf('\n') + 1), body = out.slice(0, out.lastIndexOf('\n'));
    if (!(status >= 200 && status < 300)) { console.error(`FAILED ${name}: ${status || r.stderr} ${body.slice(0, 500)}`); process.exit(1); }
    console.log(`ok ${name}${args[0] === '-e' ? '\n' + body : ''}`);
  }
})();
