// Live check of notifications on Supabase. Three throwaway members. B turns notifications on with a stand-in device whose
// address always answers "gone" (410): when the server really encrypts, signs and posts a notification, it gets 410 and
// forgets the device. So: while B has muted A, A's message must leave the device in place; C's message must remove it.
// All three are deleted at the end.   node scripts/live-notify.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const made = [];
async function member(tag) {
  const name = 'zz' + tag + Math.floor(Math.random() * 1e6), db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.auth.signUp({ email: name + '@members.user-app.invalid', password: 'Nt-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
  if (error) throw new Error('sign-up: ' + error.message);
  made.push(db);
  const { data: u } = await db.auth.getUser(); await db.from('profiles').update({ setup_done: true }).eq('id', u.user.id);
  const fn = async (f, body) => { const r = await db.functions.invoke(f, { body }); if (!r.error) return r.data; try { return await r.error.context.json(); } catch { return { error: r.error.message }; } };
  const say = async (to, text) => { const r = await fn('send', { kind: 'chat', to, text }); if (!r.ok) throw new Error('send: ' + (r.error || r.blocked)); };
  return { name, db, fn, say };
}
(async () => {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const sub = { endpoint: 'https://httpbin.org/status/410?n=' + crypto.randomBytes(6).toString('hex'),
    keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  try {
    const a = await member('nta'), b = await member('ntb'), c = await member('ntc');
    const on = async () => (await b.fn('push', { action: 'status', endpoint: sub.endpoint })).on;
    const k = await b.fn('push', { action: 'key' });
    check('the server gives its public key', k.ok === true && /^[A-Za-z0-9_-]{80,}$/.test(k.key || ''), (k.key || k.error || '').slice(0, 12) + '…');
    check('a bad device is refused', (await b.fn('push', { action: 'on', sub: { endpoint: 'http://x', keys: {} } })).ok === false);
    check('notifications turn on for this device', (await b.fn('push', { action: 'on', sub })).ok === true && await on() === true);
    check("another member can't see it", (await a.fn('push', { action: 'status', endpoint: sub.endpoint })).on === false);
    await b.say(a.name, 'Hello, nice to meet you here.');
    check('muting a chat works', !!(await b.db.rpc('mute_chat', { name: a.name })).data);
    await a.say(b.name, 'Hi! How has your week been?'); await wait(6000);
    check('while the chat is muted, no notification is sent', await on() === true);
    await c.say(b.name, 'Hey, I saw you like walks too. Where do you go?');
    let still = true; for (let i = 0; i < 10 && still; i++) { await wait(2000); still = await on(); }
    check('a new message sends a notification (the stand-in device answered "gone" and was forgotten)', still === false);
    check('notifications turn on again', (await b.fn('push', { action: 'on', sub })).ok === true);
    check('and off', (await b.fn('push', { action: 'off', endpoint: sub.endpoint })).ok === true && await on() === false);
  } catch (e) { check('run', false, e.message); }
  for (const db of made) check('test member deleted', !(await db.rpc('delete_my_account')).error);
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
