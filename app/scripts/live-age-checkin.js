// Live check of the check-in after a danger report and the age check, on Supabase. Two throwaway members:
// one reports the other, who then sees the check-in, is paused, confirms their age, and is paused for review
// after a second sign. Both are deleted at the end. Uses real Claude calls (a few cents).
//   node scripts/live-age-checkin.js
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
async function member(tag) {
  const name = 'zz' + tag + Math.floor(Math.random() * 1e6);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.auth.signUp({ email: name + '@members.user-app.invalid', password: 'Age-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
  if (error) throw new Error('sign-up failed: ' + error.message);
  const fn = async (f, body) => { const r = await db.functions.invoke(f, { body }); if (!r.error) return r.data; try { return await r.error.context.json(); } catch { return { error: r.error.message }; } };
  const notices = async () => ((await db.rpc('my_notices')).data || [])[0] || {};
  return { name, db, fn, notices };
}
(async () => {
  let a, b;
  try {
    a = await member('rep'); b = await member('kid');
    // B says hello first, so A can report someone they've chatted with.
    let r = await b.fn('send', { kind: 'chat', to: a.name, text: 'Hi, nice to meet you. How is your week going?' });
    check('the member can send before any report', r.ok === true, r.error);
    check('HS-07 no check-in to begin with', (await b.notices()).checkin === false);

    r = await a.fn('report', { username: b.name, reason: 'Seems to be in danger' });
    check('HS-07 a danger report is accepted as urgent', r.ok === true && r.urgent === true);
    check('HS-07 the reported member has a check-in waiting', (await b.notices()).checkin === true);
    await b.db.rpc('seen_checkin');
    check('HS-07 once shown, the check-in is cleared', (await b.notices()).checkin === false);

    r = await a.fn('report', { username: b.name, reason: 'Under 18' });
    check('HS-08 an under-18 report is accepted as urgent', r.ok === true && r.urgent === true);
    check('HS-08 the reported member is asked to confirm their age', (await b.notices()).age_check === 'ask');
    r = await b.fn('send', { kind: 'chat', to: a.name, text: 'Is anyone there?' });
    check('HS-08 a paused member cannot send', r.ok === false && r.ageCheck === 'ask', r.error);

    check('HS-09 confirming their age works', (await b.db.rpc('confirm_age')).data === true);
    check('HS-09 the account is open again', !(await b.notices()).age_check);
    r = await b.fn('send', { kind: 'chat', to: a.name, text: 'Sorry about that, all sorted now. Hope you are well.' });
    check('HS-09 they can send again', r.ok === true, r.error);
    check('HS-09 confirming again does nothing', (await b.db.rpc('confirm_age')).data === false);

    await a.fn('report', { username: b.name, reason: 'Under 18' });
    check('HS-08 another report after confirming does not pause them', !(await b.notices()).age_check);
    r = await b.fn('send', { kind: 'chat', to: a.name, text: "I'm 15 and my dad drinks a lot" });
    check('HS-08 saying they are under 18 is blocked', r.ok === false && !!r.blocked, r.blocked || r.error);
    check('HS-09 after confirming, a second sign pauses the account for review', r.ageCheck === 'review' && (await b.notices()).age_check === 'review');
    r = await b.fn('send', { kind: 'chat', to: a.name, text: 'hello?' });
    check('HS-09 and they cannot send while it is reviewed', r.ok === false && /reviewed/.test(r.error || ''), r.error);
  } catch (e) { check('run', false, e.message); }
  for (const m of [a, b]) if (m) check(`test member deleted`, !(await m.db.rpc('delete_my_account')).error);
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
