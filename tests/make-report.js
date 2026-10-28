// Builds a pass/fail report from Playwright's JSON results and the function list.
// Usage: npm test, then npm run report. Writes results/test-report.html and results/test-results.csv
const fs = require('fs'); const path = require('path');
const R = p => path.join(__dirname, p);

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.length > 1);
}
const csvCell = v => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = s => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');

const results = JSON.parse(fs.readFileSync(R('results/results.json'), 'utf8'));
const [head, ...funcs] = parseCsv(fs.readFileSync(R('function-list.csv'), 'utf8'));
const notes = fs.existsSync(R('report-notes.json')) ? JSON.parse(fs.readFileSync(R('report-notes.json'), 'utf8')) : {};

// Flatten every test with its outcome
const tests = [];
(function walk(suites) {
  for (const s of suites || []) {
    for (const spec of s.specs || []) for (const t of spec.tests || []) {
      const r = t.results[t.results.length - 1] || {};
      tests.push({ title: spec.title, file: spec.file, ok: t.status === 'expected', status: t.status, ms: r.duration || 0, error: strip(r.error && r.error.message).split('\n').slice(0, 3).join(' ') });
    }
    walk(s.suites);
  }
})(results.suites);

const byId = {};
for (const t of tests) { const m = t.title.match(/^([A-Z]{1,2}-\d{2})\b/); if (m) (byId[m[1]] = byId[m[1]] || []).push(t); }
const rows = funcs.map(([id, area, fn, how, exp, st, backend]) => {
  const ts = byId[id] || [];
  const failed = ts.filter(t => !t.ok);
  return { id, area, fn, st, backend: backend || '', ts, failed, result: !ts.length ? 'Not tested' : failed.length ? 'Fail' : 'Pass' };
});
const orphan = tests.filter(t => { const m = t.title.match(/^([A-Z]{1,2}-\d{2})\b/); return !m || !funcs.some(f => f[0] === m[1]); });

const total = tests.length, passed = tests.filter(t => t.ok).length, failed = total - passed;
const covered = rows.filter(r => r.ts.length).length, fnPass = rows.filter(r => r.result === 'Pass').length, twice = rows.filter(r => r.ts.length >= 2).length, backend = rows.filter(r => r.backend);
const started = new Date(results.stats.startTime), secs = Math.round(results.stats.duration / 1000);
const when = started.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

// CSV: function list plus results
const out = [[...head, 'Tests', 'Passed', 'Failed', 'Result', 'Test names', 'Failure details'].map(csvCell).join(',')];
funcs.forEach((f, i) => { const r = rows[i]; out.push([...f, r.ts.length, r.ts.length - r.failed.length, r.failed.length, r.result, r.ts.map(t => t.title).join(' | '), r.failed.map(t => t.error).join(' | ')].map(csvCell).join(',')); });
fs.writeFileSync(R('results/test-results.csv'), '﻿' + out.join('\n') + '\n');

// HTML report
const areas = [...new Set(rows.map(r => r.area))];
const pill = r => `<span class="pill ${r === 'Pass' ? 'pass' : r === 'Fail' ? 'fail' : 'none'}">${r}</span>`;
const noteList = (items, cls) => (items || []).map(n => `<li class="${cls}"><span class="nid">${esc(n.id)}</span><div><b>${esc(n.summary)}</b><p>${esc(n.detail)}</p></div></li>`).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(notes.title || 'User Test Report')}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap">
<style>
/* Layout: one reading column; summary tiles, then fixes, then one table per app area. Light only, matching the app. */
:root{--bg:#EAF3FB;--surface:#FFFFFF;--ink:#0A1E3D;--muted:#3E5878;--line:#9DBBDA;--frame:#0A1E3D;--accent:#0D3B7A;--hl:#FFD43B;
 --pass:#17663A;--pass-soft:#DDF3E5;--fail:#B42318;--fail-soft:#FDE4E1;--none:#6B7A8C;--none-soft:#EEF1F4;color-scheme:light;
 --f-display:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;--f-body:"Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--f-body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 48px}
.wrap{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:28px}
header{border:3px solid var(--frame);background:linear-gradient(90deg,#0A2A5E,#4E9FE0);color:#fff;padding:22px 22px 20px}
h1{font-family:var(--f-display);font-weight:800;font-size:clamp(28px,5vw,40px);line-height:1;margin:0;letter-spacing:-.02em}
header p{margin:8px 0 0;opacity:.92}
h2{font-family:var(--f-display);font-weight:800;font-size:22px;margin:0;letter-spacing:-.01em;text-wrap:balance}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.tile{background:var(--surface);border:2px solid var(--frame);padding:14px 16px}
.tile b{display:block;font-family:var(--f-display);font-size:34px;font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums}
.tile span{color:var(--muted);font-size:13.5px}
.tile.good{background:var(--pass-soft)} .tile.bad{background:var(--fail-soft)}
.bar{height:14px;border:2px solid var(--frame);background:var(--fail-soft);display:flex}
.bar i{display:block;background:var(--pass)}
section{display:flex;flex-direction:column;gap:12px}
.notes{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.notes li{display:flex;gap:12px;background:var(--surface);border:2px solid var(--frame);padding:12px 14px}
.notes li.corr{border-style:dashed}
.notes p{margin:4px 0 0;color:var(--muted)}
.nid{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;background:var(--hl);border:1px solid var(--frame);padding:1px 6px;height:fit-content;white-space:nowrap}
.tbl{overflow-x:auto;border:2px solid var(--frame);background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:640px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#F3F8FD}
td.id{font-family:ui-monospace,Menlo,Consolas,monospace;white-space:nowrap}
td.n{font-variant-numeric:tabular-nums;text-align:center}
tr:last-child td{border-bottom:0}
.pill{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border:1px solid currentColor;white-space:nowrap}
.pill.pass{color:var(--pass);background:var(--pass-soft)} .pill.fail{color:var(--fail);background:var(--fail-soft)} .pill.none{color:var(--none);background:var(--none-soft)}
.st{font-size:12.5px;color:var(--muted)}
.err{color:var(--fail);font-size:12.5px;margin-top:4px}
details summary{cursor:pointer;color:var(--accent);font-size:13px}
details ul{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--muted)}
.foot{color:var(--muted);font-size:13.5px;border-top:2px solid var(--frame);padding-top:14px}
code{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--surface);border:1px solid var(--line);padding:0 4px}
</style></head><body><div class="wrap">
<header><h1>${esc(notes.title || 'User Test Report')}</h1><p>${esc(notes.prototype || '')} · Run ${esc(when)} · Chromium · ${secs}s</p></header>
<section><div class="tiles">
<div class="tile ${failed ? 'bad' : 'good'}"><b>${passed} / ${total}</b><span>tests passed</span></div>
<div class="tile ${failed ? 'bad' : ''}"><b>${failed}</b><span>tests failed</span></div>
<div class="tile"><b>${covered} / ${rows.length}</b><span>functions tested</span></div>
<div class="tile ${fnPass === rows.length ? 'good' : ''}"><b>${fnPass}</b><span>functions passing</span></div>
<div class="tile"><b>${twice} / ${rows.length}</b><span>functions with 2 or more tests</span></div>
<div class="tile"><b>${backend.length}</b><span>need a backend to test fully</span></div>
</div><div class="bar" role="img" aria-label="${passed} of ${total} tests passed"><i style="width:${(passed / total * 100).toFixed(2)}%"></i></div></section>
${(notes.changes || []).length ? `<section><h2>What changed in this version</h2><ul class="notes">${notes.changes.map(c => `<li><div>${esc(c)}</div></li>`).join('')}</ul></section>` : ''}
${(notes.fixed || []).length ? `<section><h2>${esc(notes.fixed_title || 'Bugs found by the tests and fixed')}</h2><ul class="notes">${noteList(notes.fixed, 'fix')}</ul></section>` : ''}
${(notes.corrected || []).length ? `<section><h2>Corrections</h2><ul class="notes">${noteList(notes.corrected, 'corr')}</ul></section>` : ''}
${areas.map(a => { const rs = rows.filter(r => r.area === a); const pf = rs.filter(r => r.result === 'Pass').length;
  return `<section><h2>${esc(a)} <span class="st">${pf} of ${rs.length} passing</span></h2><div class="tbl"><table>
<thead><tr><th>ID</th><th>Function</th><th>App status</th><th>Tests</th><th>Result</th></tr></thead><tbody>
${rs.map(r => `<tr><td class="id">${esc(r.id)}</td><td>${esc(r.fn)}${r.ts.length ? `<details><summary>${r.ts.length === 1 ? 'Show test' : 'Show ' + r.ts.length + ' tests'}</summary><ul>${r.ts.map(t => `<li>${esc(t.title.replace(/^[A-Z]{1,2}-\d{2}\s*/, ''))}${t.ok ? '' : ' (failed)'}</li>`).join('')}</ul></details>` : ''}${r.failed.map(t => `<div class="err">${esc(t.error)}</div>`).join('')}</td><td class="st">${esc(r.st)}</td><td class="n">${r.ts.length}</td><td>${pill(r.result)}</td></tr>`).join('')}
</tbody></table></div></section>`; }).join('')}
${backend.length ? `<section><h2>Can't be fully tested in the prototype</h2><p class="st">These functions pass their tests in the prototype, but the real behaviour depends on a server, a real device or outside checks. They need testing again once there is a backend.</p><div class="tbl"><table><thead><tr><th>ID</th><th>Function</th><th>Why</th></tr></thead><tbody>${backend.map(r => `<tr><td class="id">${esc(r.id)}</td><td>${esc(r.fn)}</td><td class="st">${esc(r.backend)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
${orphan.length ? `<section><h2>Tests not linked to a function</h2><ul>${orphan.map(t => `<li>${esc(t.title)}</li>`).join('')}</ul></section>` : ''}
<p class="foot">Each test starts in a fresh browser with no saved data, using the sample people and the demo account. Clock fixed at 2pm UTC, or 11pm UTC for late-night tests. To run again: <code>npm install</code>, <code>npx playwright install chromium</code>, <code>npm test</code>, then <code>npm run report</code>.</p>
</div></body></html>`;
fs.writeFileSync(R('results/test-report.html'), html);
console.log(`Report: ${passed}/${total} tests passed, ${covered}/${rows.length} functions tested -> results/test-report.html, results/test-results.csv`);
