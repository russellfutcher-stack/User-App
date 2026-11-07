// Live check of the safety functions on Supabase: a throwaway member sends normal, blocked and crisis messages,
// reports someone, asks for a review and requests rooms; then the member is deleted. Uses real Claude calls (a few cents).
//   node scripts/live-safety.js
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const name = 'zzsafe' + Math.floor(Math.random() * 1e6);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.auth.signUp({ email: name + '@members.user-app.invalid', password: 'Safe-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
  if (error) { console.log('sign-up failed', error.message); process.exit(1); }
  const fn = async (f, body) => { const t = Date.now(); const r = await db.functions.invoke(f, { body }); let d = r.data;
    if (r.error) { try { d = await r.error.context.json(); } catch { d = { error: r.error.message }; } } return { ...d, ms: Date.now() - t }; };
  try {
    check('direct sending is closed', !!(await db.rpc('send_message', { name: 'MossyOtter', body: 'hi' })).error);
    let r = await fn('send', { kind: 'chat', to: 'MossyOtter', text: 'Hi! Saw you like dog walks. How is Biscuit?' });
    check('a normal message is sent', r.ok === true && !r.help, `${r.ms}ms ${r.error || ''}`);
    r = await fn('send', { kind: 'chat', to: 'MossyOtter', text: 'got any bars? can pay cash' });
    check('a dealing message is blocked by the rules', r.ok === false && !!r.blocked, `${r.ms}ms`);
    r = await fn('send', { kind: 'chat', to: 'MossyOtter', text: 'my snap is the same as my name here, add me' });
    check('off-app contact is blocked by Claude', r.ok === false && !!r.blocked, `${r.ms}ms: ${r.blocked || r.error}`);
    r = await fn('send', { kind: 'chat', to: 'MossyOtter', text: 'I used to sell, now I help others stay clean' });
    check('recovery talk is sent', r.ok === true, `${r.ms}ms ${r.blocked || r.error || ''}`);
    r = await fn('send', { kind: 'chat', to: 'MossyOtter', text: 'I want to die, I cannot do this anymore' });
    check('a crisis message is sent with help', r.ok === true && r.help === true, `${r.ms}ms`);
    await db.rpc('join_room', { room: 'r1' });
    r = await fn('send', { kind: 'room', to: 'r1', text: 'Morning all, lovely walk by the river today' });
    check('a room post is sent', r.ok === true, `${r.ms}ms ${r.error || ''}`);
    r = await fn('report', { username: 'PixelHare', reason: 'Spam or scam' });
    check('a report is accepted', r.ok === true && r.urgent === false, `${r.ms}ms`);
    r = await fn('report', { username: 'PixelHare', reason: 'Seems to be in danger' });
    check('a danger report is urgent', r.ok === true && r.urgent === true);
    r = await fn('review', { topic: 'A message that was blocked', text: 'I was blocked but I was only talking about my naloxone training.' });
    check('a review is requested', r.ok === true && /^HR-\d+$/.test(r.review?.id || ''), r.review?.id);
    let decided = null;
    for (let i = 0; i < 30 && !decided; i++) { await wait(2000); decided = ((await db.rpc('my_reviews')).data || []).find(x => x.id === r.review?.id && x.note); }
    check('it is decided automatically', !!decided, decided ? `${decided.status}: ${decided.note}` : 'not decided after 60s');
    const urgent = ((await db.rpc('my_reviews')).data || []).find(x => x.auto);
    check('the danger report raised an automatic review', !!urgent, urgent?.status);
    r = await fn('request-room', { name: 'Zz Knit and Natter ' + name.slice(-4), cat: 'interests', desc: 'Knitting and crochet: show what you are making, swap patterns and help each other with tricky stitches.' });
    check('a good room request is approved', r.ok === true, `${r.ms}ms ${r.error || ''}`);
    if (r.ok) { const posts = (await db.rpc('room_posts_of', { room: r.id })).data || []; check('with a welcome post', /^Welcome to/.test(posts[0]?.body || ''), posts[0]?.body); await db.rpc('leave_room', { room: r.id }); }
    r = await fn('request-room', { name: 'Book Club Corner', cat: 'interests', desc: 'A place to talk about the books we are reading.' });
    check('a near-duplicate of Book Nook is refused', r.ok === false, r.error);
  } catch (e) { check('run', false, e.message); }
  const del = await db.rpc('delete_my_account'); check('test member deleted', !del.error);
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
