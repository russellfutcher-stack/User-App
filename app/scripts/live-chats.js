// Live check of chats and rooms on the Supabase project: two throwaway members message each other (with Realtime),
// a sample member replies, they use rooms, then both are deleted. Messages, posts and room requests go through the safety
// check (supabase/functions), as in the app, so this makes a few real Claude calls. Run from app/ with the two Supabase settings set:
//   node scripts/live-chats.js
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const n = Math.floor(Math.random() * 1e6), made = [];
  const member = async name => {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await db.auth.signUp({ email: name + '@members.user-app.invalid', password: 'Live-' + Math.random().toString(36).slice(2) + '!9', options: { data: { username: name } } });
    if (error) throw new Error('sign-up: ' + error.message);
    made.push(db); const { data: u } = await db.auth.getUser();
    await db.from('profiles').update({ setup_done: true, tags: ['I02', 'D02'], vis_mh: 'matches' }).eq('id', u.user.id);
    return db;
  };
  const rpc = async (db, fn, args) => { const { data, error } = await db.rpc(fn, args); if (error) throw new Error(fn + ': ' + error.message); return data; };
  const fn = async (db, f, body) => { const r = await db.functions.invoke(f, { body }); if (!r.error) return r.data; try { return await r.error.context.json(); } catch { return { error: r.error.message }; } };
  const say = async (db, to, text, kind = 'chat') => { const r = await fn(db, 'send', { kind, to, text }); if (!r.ok) throw new Error('send: ' + (r.blocked || r.error)); return r; };
  try {
    const A = 'zzchata' + n, B = 'zzchatb' + n, a = await member(A), b = await member(B);
    let heard = 0;
    const ch = b.channel('t').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { heard++; });
    await new Promise(res => ch.subscribe(s => { if (s === 'SUBSCRIBED') res(); }));
    await wait(1500); // the server takes a moment to start sending changes
    check('sending directly is closed', !!(await a.rpc('send_message', { name: B, body: 'Hi there' })).error);
    await say(a, B, 'Hi there');
    await wait(2500); check('Realtime delivers the message', heard > 0, heard + ' events');
    const bc = await rpc(b, 'my_chats');
    check('the other person sees a New chat', bc.length === 1 && bc[0].with_name === A && bc[0].unread);
    check('they see the message', (await rpc(b, 'chat_messages', { name: A }))[0]?.body === 'Hi there');
    check('opening it marks it read', !(await rpc(b, 'my_chats'))[0].unread);
    const seenBefore = (await rpc(a, 'find_members')).find(m => m.username === B).tags.join();
    await say(b, A, 'Hello!');
    const seenAfter = (await rpc(a, 'find_members')).find(m => m.username === B).tags.join();
    check('"People I chat with" tags show once both have written', seenBefore === 'I02' && seenAfter === 'I02,D02', seenBefore + ' then ' + seenAfter);
    await rpc(a, 'hide_chat', { name: B, hide: true }); check('deleting a chat hides it', (await rpc(a, 'my_chats')).length === 0);
    await rpc(a, 'hide_chat', { name: B, hide: false }); check('Undo brings it back', (await rpc(a, 'my_chats')).length === 1);
    await rpc(a, 'block', { name: B });
    const sendBlocked = await fn(b, 'send', { kind: 'chat', to: A, text: 'still there?' });
    check('a blocked person cannot message', sendBlocked.ok === false, sendBlocked.error);
    check('and the chat is hidden for both', (await rpc(a, 'my_chats')).length === 0 && (await rpc(b, 'my_chats')).length === 0);
    await rpc(a, 'unblock', { name: B }); check('unblocking brings the chat back', (await rpc(a, 'my_chats')).length === 1);
    // C-06: the server sends the reply itself, about 2 seconds later, even if nobody asks for it (Rusty, 13 Nov 2026).
    await say(a, 'MossyOtter', 'Hello Mossy, how is your week going?');
    await new Promise(r => setTimeout(r, 5000));
    let mossy = await rpc(a, 'chat_messages', { name: 'MossyOtter' });
    check('C-06 a sample member replies by itself', mossy.length === 2 && !mossy[1].mine && /Biscuit/.test(mossy[1].body), mossy.map(m => m.mine ? 'me' : 'them').join(','));
    await rpc(a, 'sample_reply', { name: 'MossyOtter' }); // the old way of asking, from copies of the app still open
    check('C-06 asking again adds no second reply', (await rpc(a, 'chat_messages', { name: 'MossyOtter' })).length === 2);
    await say(a, 'MossyOtter', 'Two quick ones:'); await say(a, 'MossyOtter', 'what helps you on hard days?');
    await new Promise(r => setTimeout(r, 5000));
    mossy = await rpc(a, 'chat_messages', { name: 'MossyOtter' });
    check('C-06 two quick messages get two replies', mossy.filter(m => !m.mine).length === 3, mossy.map(m => m.mine ? 'me' : 'them').join(','));
    const { count } = await b.from('messages').select('*', { count: 'exact', head: true });
    check("members can't read other people's chats", count === 2, count + ' readable');
    const rooms = await rpc(a, 'my_rooms');
    check('14 built-in rooms', rooms.length >= 14 && rooms[0].name === "Dog Walkers' Bench");
    check('rooms have their sample posts', (await rpc(a, 'room_posts_of', { room: 'r1' })).length >= 6);
    check("can't post before joining", (await fn(a, 'send', { kind: 'room', to: 'r1', text: 'Hello room' })).ok === false);
    await rpc(a, 'join_room', { room: 'r1' }); await say(a, 'r1', 'Hello room', 'room');
    const posts = await rpc(b, 'room_posts_of', { room: 'r1' });
    check('others see your room post', posts.some(p => p.who === A && p.body === 'Hello room'));
    const made = await fn(a, 'request-room', { name: 'Zz Birdwatchers ' + n, cat: 'interests', desc: 'Spotting local birds, sharing photos and tips on binoculars and field guides.' });
    const rid = made.id; check('the room check approves a good request', made.ok === true, made.error);
    check('a room request creates the room', (await rpc(b, 'my_rooms')).some(r => r.id === rid));
    check('names are checked ignoring capitals', /already exists/.test((await fn(a, 'request-room', { name: 'zz birdwatchers ' + n, cat: 'interests', desc: 'A duplicate of the room above.' })).error || ''));
    await rpc(a, 'leave_room', { room: rid }); check('deleting your room removes it for everyone', !(await rpc(b, 'my_rooms')).some(r => r.id === rid));
    b.removeChannel(ch);
  } catch (e) { check('run', false, e.message); }
  for (const db of made) { const r = await db.rpc('delete_my_account'); check('test member deleted', !r.error, r.error && r.error.message); }
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
