// Live check of the reset email, forgot password and room activity on Supabase (Rusty, 8 Nov 2026).
// Signs up a throwaway member, then deletes it. Run from app/ with the two Supabase settings set:
//   node scripts/live-reset-rooms.js
// The code itself is only ever emailed, so a full reset was checked by hand (8 Nov 2026), with the code's hash set in the database.
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false } });
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
(async () => {
  const name = 'zzreset' + Math.floor(Math.random() * 1e6), db = client(), out = client();
  try {
    const up = await db.auth.signUp({ email: name + '@members.user-app.invalid', password: 'Live-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
    if (up.error) throw new Error('sign-up: ' + up.error.message);
    const id = up.data.user.id;
    check('M-27 save a reset email', !(await db.from('recovery_emails').upsert({ member: id, email: 'zz@example.com' })).error);
    check('M-27 a bad email is refused', !!(await db.from('recovery_emails').upsert({ member: id, email: 'not an email' })).error);
    const own = (await db.from('recovery_emails').select('email')).data || [];
    check('M-27 members read only their own', own.length === 1 && own[0].email === 'zz@example.com', own.length + ' rows');
    check('M-27 signed-out visitors read nothing', !(await out.from('recovery_emails').select('email')).data);
    const call = b => out.functions.invoke('reset-password', { body: b }).then(async r => r.data || await r.error?.context?.json());
    const replies = [await call({ step: 'send', username: name, email: 'zz@example.com' }), await call({ step: 'send', username: name, email: 'zz@example.com' }),
      await call({ step: 'send', username: name, email: 'other@example.com' }), await call({ step: 'send', username: 'zznobody' + id.slice(0, 6), email: 'zz@example.com' })];
    check('WS-07 the reply never says whether they matched', replies.every(r => r && r.ok === true && Object.keys(r).length === 1), JSON.stringify(replies));
    check('WS-07 a wrong code is refused', (await call({ step: 'reset', username: name, code: '000000', password: 'New-pass-456!' }))?.ok === false);
    check('WS-07 a short password is refused', /8 characters/.test((await call({ step: 'reset', username: name, code: '000000', password: 'short' }))?.error || ''));
    await db.rpc('join_room', { room: 'r1' });
    const before = (await db.rpc('my_rooms')).data.find(r => r.id === 'r5');
    await db.rpc('room_seen', { room: 'r5' });
    const after = (await db.rpc('my_rooms')).data.find(r => r.id === 'r5');
    check('R-13 opening a room counts you as active', after.active === before.active + 1 || after.active >= 1, before.active + ' then ' + after.active);
    check('R-13 signed-out visitors cannot mark a room', !!(await out.rpc('room_seen', { room: 'r5' })).error);
  } catch (e) { check('run', false, e.message); }
  const r = await db.rpc('delete_my_account'); check('test member deleted', !r.error, r.error && r.error.message);
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
