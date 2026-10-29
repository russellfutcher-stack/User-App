// Live check of the arbitrator dashboard on Supabase. Needs an account listed in public.arbitrators:
//   ARB_USER=<username> ARB_PASS=<password> node scripts/live-arbitrator.js
// A throwaway member asks for a review; the arbitrator sees it, changes the decision, and the member sees the note.
// The member is deleted at the end. Uses real Claude calls (a few cents).
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const domain = process.env.EXPO_PUBLIC_ACCOUNT_EMAIL_DOMAIN || 'members.user-app.invalid';
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const arb = createClient(url, key, { auth: { persistSession: false } });
  const signed = await arb.auth.signInWithPassword({ email: `${(process.env.ARB_USER || '').toLowerCase()}@${domain}`, password: process.env.ARB_PASS || '' });
  if (signed.error) { console.log('arbitrator sign-in failed:', signed.error.message); process.exit(2); }
  const name = 'zzarb' + Math.floor(Math.random() * 1e6);
  const m = createClient(url, key, { auth: { persistSession: false } });
  try {
    const up = await m.auth.signUp({ email: `${name}@${domain}`, password: 'Arb-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
    if (up.error) throw new Error('sign-up failed: ' + up.error.message);
    check('AD-01 the arbitrator is recognised', (await arb.rpc('am_arbitrator')).data === true);
    check('AD-01 a member is not an arbitrator', (await m.rpc('am_arbitrator')).data === false);
    check('AD-02 a member cannot read the figures', !!(await m.rpc('arb_figures')).error);
    check('AD-03 a member cannot read the cases', !!(await m.rpc('arb_cases')).error);
    await m.from('profiles').update({ country: 'Australia' }).eq('username', name);

    const r = await m.functions.invoke('review', { body: { topic: 'Something else', text: 'Someone keeps replying to me in every room after I asked them to stop.' } });
    const id = r.data?.review?.id; check('a member asks for a review', /^HR-\d+$/.test(id || ''), id);
    let mine = null;
    for (let i = 0; i < 30 && !mine; i++) { await wait(2000); mine = ((await m.rpc('my_reviews')).data || []).find(x => x.id === id && x.note); }
    check('AD-13 it is decided automatically', mine?.decided_by === 'automatic', mine?.status);

    const f = (await arb.rpc('arb_figures')).data || {};
    check('AD-02 live summary figures', ['activeToday', 'activeWeek', 'newMembers', 'peers', 'wantPeers'].every(k => typeof f[k] === 'number'), `${f.activeToday} active today, ${f.newMembers} new`);
    check('AD-06 live message safety figures', f.checked >= f.blocked && Array.isArray(f.blockedBy), `${f.checked} checked, ${f.blocked} blocked`);
    check('AD-07 live reports by reason', Array.isArray(f.reports));
    check('AD-09 the member\'s chosen country is counted', (f.countries || []).some(([c]) => c === 'Australia'));
    check('AD-11 live rooms and health', typeof f.rooms === 'number' && typeof f.overdue === 'number', `${f.rooms} rooms, ${f.overdue} overdue`);

    const c = ((await arb.rpc('arb_cases')).data || []).find(x => x.id === id);
    check('AD-03 the case is in the queue, with the username', c?.member === name, c?.status);
    check('AD-04 a decision needs a note', !!(await arb.rpc('arb_decide', { case_id: id, outcome: 'Overturned', why: 'no' })).error);
    check('AD-04 a member cannot decide', !!(await m.rpc('arb_decide', { case_id: id, outcome: 'Overturned', why: 'Changing my own case.' })).error);
    const d = await arb.rpc('arb_decide', { case_id: id, outcome: 'Action changed', why: 'The other member has been warned. You can also block them.' });
    check('AD-04 the arbitrator changes the decision', !d.error, d.error?.message);
    mine = ((await m.rpc('my_reviews')).data || []).find(x => x.id === id);
    check('AD-05 the member sees it, by the arbitrator', mine?.decided_by === 'arbitrator' && mine?.status === 'Decided: Action changed' && /warned/.test(mine?.note || ''), mine?.note);
  } catch (e) { check('run', false, e.message); }
  check('test member deleted', !(await m.rpc('delete_my_account')).error);
  await arb.auth.signOut();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
