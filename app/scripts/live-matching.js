// Live check of matching on the Supabase project: signs up two throwaway members, checks what each can see
// of the other, the sample members, blocking and the score, then deletes both. Run from app/ with the two Supabase settings set:
//   node scripts/live-matching.js
const { createClient } = require('@supabase/supabase-js');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false } });
let failed = 0;
const check = (label, ok, extra = '') => { console.log((ok ? 'ok    ' : 'FAILED') + '  ' + label + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };
(async () => {
  const n = Math.floor(Math.random() * 1e6), made = [];
  const member = async (name, profile) => {
    const db = client(), pass = 'Live-' + Math.random().toString(36).slice(2) + '!9';
    const { error } = await db.auth.signUp({ email: name.toLowerCase() + '@members.user-app.invalid', password: pass, options: { data: { username: name } } });
    if (error) throw new Error('sign-up: ' + error.message);
    made.push(db);
    const { data: u } = await db.auth.getUser();
    const r = await db.from('profiles').update({ ...profile, setup_done: true }).eq('id', u.user.id); if (r.error) throw new Error('save: ' + r.error.message);
    return db;
  };
  try {
    const a = await member('zzlivea' + n, { tags: ['I02', 'D02', 'O01'], looking: ['chat', 'walk', 'pets'], stage: 'early', wants_peer: true });
    const b = await member('zzliveb' + n, { tags: ['I02', 'D02', 'O01', 'M05'], vis_mh: 'matches', vis_subs: 'me' });
    const { data: list, error } = await a.rpc('find_members'); if (error) throw new Error('find_members: ' + error.message);
    const samples = list.filter(m => m.username !== 'zzliveb' + n);
    check('100 sample members', samples.filter(m => m.region).length === 100, samples.length + ' others');
    check('21 sample peer supporters', samples.filter(m => m.is_peer && m.region).length === 21);
    const mossy = list.find(m => m.username === 'MossyOtter');
    check('MossyOtter shows all its tags', mossy && mossy.tags.join() === 'I01,I02,I05,D02,O01', mossy && mossy.tags.join());
    const other = list.find(m => m.username === 'zzliveb' + n);
    check('the other member is listed', !!other);
    check('their hidden tags are not shown', other && other.tags.join() === 'I02', other && other.tags.join());
    check('but still count towards the score', other && other.pct > 60, other && other.pct + '%');
    const { count } = await a.from('profiles').select('*', { count: 'exact', head: true });
    check("members can't read other profiles", count === 1, count + ' readable');
    await a.rpc('block', { name: 'zzliveb' + n });
    const after = (await a.rpc('find_members')).data;
    check('blocked member disappears', !after.some(m => m.username === 'zzliveb' + n));
    check('and the blocker disappears for them', !(await b.rpc('find_members')).data.some(m => m.username === 'zzlivea' + n));
    check('Me page lists the block', (await a.rpc('my_blocked')).data.some(r => r.username === 'zzliveb' + n));
  } catch (e) { check('run', false, e.message); }
  for (const db of made) { const r = await db.rpc('delete_my_account'); check('test member deleted', !r.error, r.error && r.error.message); }
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
