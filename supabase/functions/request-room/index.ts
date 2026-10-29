// A member asks for a new room. Body: { name, cat, desc }. The room check approves or refuses it, and can correct the type.
import { CAREFUL, decide, quote, ROOM_SCHEMA, RoomCheck } from '../_shared/claude.ts';
import { admin, must, reply, serve } from '../_shared/db.ts';
import { ROOM_POLICY } from '../_shared/policy.ts';
import { notAllowed } from '../_shared/safety.ts';

const TAKEN = 'A room with that name already exists or has been requested.';

serve(async (me, b) => {
  const name = String(b.name || '').trim(), desc = String(b.desc || '').trim(), cat = String(b.cat || '');
  if (name.length < 3 || name.length > 40 || desc.length < 10 || desc.length > 160 || !['interests', 'drugs', 'mh'].includes(cat)) return reply({ ok: false, error: 'length' }, 400);
  if (notAllowed(name + ' ' + desc)) return reply({ ok: false, error: "Room requests can't mention buying or selling, prices, links or contact details." });
  if ((must(await admin.rpc('requests_today', { m: me.id })) as number) >= 5) return reply({ ok: false, error: "You've asked for 5 rooms today. Try again tomorrow." });
  const rooms = must(await admin.from('rooms').select('name').eq('deleted', false)) as { name: string }[];
  if (rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) return reply({ ok: false, error: TAKEN });
  const input = `${quote('request', `Name: ${name}\nType: ${cat}\nPurpose: ${desc}`)}\n${quote('existing_rooms', rooms.map(r => r.name).join('\n'))}\nReview this room request.`;
  const r = await decide<RoomCheck>({ model: CAREFUL, effort: 'medium', policy: ROOM_POLICY, input, schema: ROOM_SCHEMA });
  await admin.from('moderation').insert({ member: me.id, kind: 'room_request', target: name, body: desc, action: r?.value.decision || 'unchecked', reason: r?.value.reason, model: r?.model });
  if (!r) return reply({ ok: false, error: "We couldn't check your request just now. Please try again in a moment." });
  if (r.value.decision === 'refuse') return reply({ ok: false, error: r.value.reason });
  const made = await admin.rpc('make_room', { requester: me.id, name, cat: r.value.type, descr: desc, welcome: r.value.welcome_message });
  if (made.error) return reply({ ok: false, error: /taken/.test(made.error.message) ? TAKEN : /too many/.test(made.error.message) ? "You've asked for 5 rooms today. Try again tomorrow." : 'trouble' });
  return reply({ ok: true, id: made.data });
});
