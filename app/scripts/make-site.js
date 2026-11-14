// Writes the public information website: public/about/ (served next to the app in tests and previews) and dist-site/ (the stand-alone website at https://userconnect-au.github.io/).
// The wording comes from the app itself (the Welcome page, the community agreement, and the Support page's help services),
// so the two never drift apart. The privacy policy is only included once site/settings.json names who runs User. No email
// address is published; questions go through Ask for a review in the app (Rusty, 4 Nov 2026). Run from app/:  node scripts/make-site.js   (deploy-web.sh runs it too)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
// Reads a constant's array literal from a source file. Only used on the app's own files.
const literal = (src, name) => {
  const start = src.indexOf(name), open = src.indexOf('[', src.indexOf('=', start));
  let depth = 0, i = open;
  for (; i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']' && --depth === 0) break; }
  return Function('"use strict"; return (' + src.slice(open, i + 1) + ');')();
};
const welcome = read('src/screens/Welcome.tsx'), signup = read('src/screens/SignUp.tsx');
const BENEFITS = literal(welcome, 'const BENEFITS'), HOWTO = literal(welcome, 'const HOWTO');
const AGREEMENT = [...signup.matchAll(/<Bullet>([^<]+)<\/Bullet>/g)].map(m => m[1]).slice(0, 4);
const SERVICES = literal(read('src/data/support.ts'), 'export const SERVICES');
const settings = JSON.parse(read('site/settings.json'));
const ready = !!settings.organisation.trim();
if (AGREEMENT.length !== 4 || !BENEFITS.length || !HOWTO.length || SERVICES.length < 30) throw new Error("Couldn't read the app's wording");

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const services = s => `<div class="lines"><div class="line em"><span>Emergency</span><b>${esc(s.emergency)}</b></div>${s.lines.map(([a, b]) => `<div class="line"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>`;
const privacy = ready ? `
<section id="privacy"><h2>Privacy and terms</h2>
<p>User is run by ${esc(settings.organisation)}. Members' data is stored in Australia (Sydney). We never ask for your real name or phone number. Every message is checked for safety by an automated service from Anthropic, a US company, which gets the text only, never your username or profile.</p>
<p><a href="privacy/">Read the Privacy Policy</a> · <a href="terms/">Read the Terms of Service</a></p>
</section>` : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>User: Connection and Recovery</title>
<meta name="description" content="Anonymous peer support for people who use drugs, are in recovery, or live with a mental health condition." />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'" />
<meta name="referrer" content="no-referrer" />
<link rel="icon" href="../favicon-48.png" />
<style>
:root{--ink:#0A1E3D;--muted:#3E5878;--line:#D6E4F2;--bg:#D7E9F8;--card:#fff;--soft:#EDF5FC;--accent:#0D3B7A;--danger:#B42318;--dangerSoft:#FDE4E1}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
header{background:linear-gradient(160deg,#0A2A5E,#1C6CB8 70%,#4E9FE0);color:#fff;padding:32px 20px 28px}
header .in,main{max-width:720px;margin:0 auto}h1{margin:0;font-size:34px;letter-spacing:-.02em}header p{margin:6px 0 18px;opacity:.92}
.btn{display:inline-block;background:#fff;color:var(--accent);font-weight:700;padding:11px 18px;border-radius:999px;text-decoration:none}
.help{display:inline-block;margin-left:8px;background:var(--danger);color:#fff;font-weight:700;padding:11px 18px;border-radius:999px;text-decoration:none}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:18px;font-size:14px}nav a{color:#fff}
main{padding:20px 16px 40px}section{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;margin:0 0 16px}
h2{margin:0 0 10px;font-size:22px}h3{margin:18px 0 6px;font-size:16px}ul,ol{padding-left:22px;margin:6px 0}li{margin:4px 0}
.lines{display:grid;gap:6px;margin:6px 0 14px}.line{display:flex;justify-content:space-between;gap:12px;background:var(--soft);border-radius:10px;padding:9px 12px;font-size:14px}
.line b{text-align:right;white-space:nowrap}.line.em{background:var(--dangerSoft)}.muted{color:var(--muted);font-size:14px}footer{text-align:center;color:var(--muted);font-size:13px;padding:0 16px 32px}
details summary{cursor:pointer;font-weight:700;margin:4px 0}
</style>
</head>
<body>
<header><div class="in">
<h1>User</h1>
<p>Connection and Recovery. Anonymous peer support for people who use drugs, are in recovery, or live with a mental health condition. For adults, 18 and over.</p>
<a class="btn" href="../">Open User</a><a class="help" href="#help">Help</a>
<nav><a href="#about">About</a><a href="#how">How it works</a><a href="#safety">Safety</a>${ready ? '<a href="#privacy">Privacy</a>' : ''}<a href="#help">Help services</a>${ready ? '<a href="terms/">Terms</a>' : ''}</nav>
</div></header>
<main>
<section id="about"><h2>Why people use User</h2>
<ul>${BENEFITS.map(([b, t]) => `<li><b>${esc(b)}</b> ${esc(t)}</li>`).join('')}</ul>
<p class="muted">User is peer support, not a medical or emergency service.</p></section>

<section id="how"><h2>How it works</h2>
<ol>${HOWTO.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<p class="muted">You can add User to your phone's home screen: on iPhone, open it in Safari, tap Share, then Add to Home Screen. On Android, open it in Chrome and tap Install app.</p></section>

<section id="safety"><h2>Safety and the community agreement</h2>
<p>Everyone agrees to this when they join:</p>
<ol>${AGREEMENT.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<h3>How it's kept safe</h3>
<ul><li>Every message is checked for safety before anyone sees it. Buying, selling or sourcing drugs is blocked. Talking about drug use, recovery and harm reduction is always welcome.</li>
<li>If a message sounds like someone is in crisis, it's still sent, and they're shown people to talk to straight away.</li>
<li>Members can block and report anyone. Serious reports, such as someone being in danger or under 18, are dealt with urgently.</li>
<li>Breaking the agreement leads to a warning, then a mute, a pause, or removal.</li>
<li>Anyone who thinks a decision was wrong can ask for a review. Every review is decided straight away, and an independent arbitrator checks decisions and can change them.</li></ul></section>
${privacy}
<section id="help"><h2>Help services</h2>
<p><b>If you are in danger or someone may have overdosed, call your emergency number now.</b> If you have naloxone, use it and stay with them.</p>
${['Australia', 'United Kingdom', 'United States', 'Canada', 'Ireland', 'New Zealand'].map(c => SERVICES.find(s => s.country === c)).map(s => `<h3>${esc(s.country)}</h3>${services(s)}`).join('')}
<details><summary>All ${SERVICES.length} countries</summary>${SERVICES.map(s => `<h3>${esc(s.country)}</h3>${services(s)}`).join('')}</details>
<p class="muted">Services can change. If a number doesn't work, findahelpline.com lists services worldwide.</p></section>
</main>
<footer>User is peer support, not a medical or emergency service.${ready ? ' · <a href="privacy/">Privacy Policy</a> · <a href="terms/">Terms of Service</a>' : ''}</footer>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'public/about'), { recursive: true });
// The Terms of Service and Privacy Policy (Rusty, 14 Nov 2026), from app/site/legal, each on its own page.
const head = html.slice(0, html.indexOf('</head>')).replace('<link rel="icon" href="../favicon-48.png" />', '<link rel="icon" href="../../favicon-48.png" />');
for (const [slug, title] of [['terms', 'Terms of Service'], ['privacy', 'Privacy Policy']]) {
  if (!ready) continue;
  const body = read(`site/legal/${slug}.html`);
  const page = head.replace(/<title>[^<]*<\/title>/, `<title>User: ${title}</title>`) + `<style>main section h1{margin:0 0 4px;font-size:28px}main section h2{margin:20px 0 6px;font-size:18px}</style></head>
<body>
<header><div class="in"><h1>User</h1><p>Connection and Recovery</p><a class="btn" href="../../">Open User</a><a class="help" href="../#help">Help</a>
<nav><a href="../">About</a><a href="../privacy/">Privacy Policy</a><a href="../terms/">Terms of Service</a></nav></div></header>
<main><section>${body}</section></main>
<footer>User is peer support, not a medical or emergency service.</footer>
</body>
</html>
`;
  fs.mkdirSync(path.join(root, `public/about/${slug}`), { recursive: true });
  fs.writeFileSync(path.join(root, `public/about/${slug}/index.html`), page);
}
fs.writeFileSync(path.join(root, 'public/about/index.html'), html);
// The same pages as the stand-alone website at the top of the address, with the app at /app/ (Rusty, 14 Nov 2026).
// deploy-web.sh publishes dist-site/ at the top and the app inside it.
const site = path.join(root, 'dist-site');
fs.rmSync(site, { recursive: true, force: true });
const top = s => s.replace('href="../favicon-48.png"', 'href="app/favicon-48.png"').replace('class="btn" href="../"', 'class="btn" href="app/"');
const sub = s => s.replace('href="../../favicon-48.png"', 'href="../app/favicon-48.png"').replace('class="btn" href="../../"', 'class="btn" href="../app/"');
fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(path.join(site, 'index.html'), top(html));
for (const slug of ready ? ['terms', 'privacy'] : []) {
  fs.mkdirSync(path.join(site, slug), { recursive: true });
  fs.writeFileSync(path.join(site, slug, 'index.html'), sub(fs.readFileSync(path.join(root, `public/about/${slug}/index.html`), 'utf8')));
}
console.log(`Wrote public/about/index.html${ready ? '' : ' (privacy policy left out until site/settings.json is filled in)'}`);
