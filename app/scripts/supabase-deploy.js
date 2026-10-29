// Deploys the Supabase functions (supabase/functions) through the Supabase Management API, and can set their secrets.
// Needs SUPABASE_ACCESS_TOKEN and EXPO_PUBLIC_SUPABASE_URL, like supabase-sql.js.
//   node scripts/supabase-deploy.js send report review request-room
//   node scripts/supabase-deploy.js --secret ANTHROPIC_API_KEY   (copies that environment variable into the functions' secrets)
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const token = process.env.SUPABASE_ACCESS_TOKEN, url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ref = (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!token || !ref) { console.error('Set SUPABASE_ACCESS_TOKEN and EXPO_PUBLIC_SUPABASE_URL first.'); process.exit(2); }
const root = path.join(__dirname, '../../supabase/functions');
const api = `https://api.supabase.com/v1/projects/${ref}`;
// The token (and any secret) goes to curl on stdin, never on the command line.
const curl = args => {
  const r = spawnSync('curl', ['-sS', '-H', '@-', ...args, '-w', '\n%{http_code}'], { input: `Authorization: Bearer ${token}\n`, encoding: 'utf8' });
  const out = (r.stdout || '').trimEnd(); return { status: +out.slice(out.lastIndexOf('\n') + 1), body: out.slice(0, out.lastIndexOf('\n')) || r.stderr };
};
const args = process.argv.slice(2);
if (args[0] === '--secret') {
  const name = args[1], value = process.env[name];
  if (!value) { console.error(`${name} is not set in this session.`); process.exit(2); }
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'secret-')), file = path.join(dir, 'body.json');
  fs.writeFileSync(file, JSON.stringify([{ name, value }]), { mode: 0o600 });
  const r = curl(['-X', 'POST', `${api}/secrets`, '-H', 'Content-Type: application/json', '--data-binary', '@' + file]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(r.status < 300 ? `ok secret ${name}` : `FAILED secret ${name}: ${r.status} ${r.body.slice(0, 300)}`); process.exit(r.status < 300 ? 0 : 1);
}
const shared = fs.readdirSync(path.join(root, '_shared')).map(f => '_shared/' + f);
for (const slug of args) {
  const files = [...fs.readdirSync(path.join(root, slug)).map(f => `${slug}/${f}`), ...shared];
  const form = files.flatMap(f => ['-F', `file=@${path.join(root, f)};filename=${f}`]);
  const meta = JSON.stringify({ entrypoint_path: `${slug}/index.ts`, name: slug, verify_jwt: true });
  const r = curl(['-X', 'POST', `${api}/functions/deploy?slug=${slug}`, ...form, '-F', `metadata=${meta};type=application/json`]);
  console.log(r.status < 300 ? `ok ${slug}` : `FAILED ${slug}: ${r.status} ${r.body.slice(0, 500)}`);
  if (r.status >= 300) process.exit(1);
}
