// Sends a chat message or room post after the safety check. Body: { kind: 'chat' | 'room', to: username or room id, text }.
import { admin, must, reply, serve } from '../_shared/db.ts';
import { checkMessage } from '../_shared/moderate.ts';

const HELD = "This message couldn't be checked just now, so it wasn't sent. Please try again in a moment.";
const until = (t: string) => new Date(t).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' (UTC)';
const LADDER: Record<string, string> = {
  warning: ' This counts as a warning.',
  muted: " You can't send messages for 24 hours, because this is your third warning this week.",
  suspended: ' Your account is paused for 7 days, because of repeated warnings.',
  removal: ' Your account is paused while it is reviewed, because of repeated dealing messages.',
};
const TYPE: Record<string, string> = { interests: 'Interest', drugs: 'Drug use', mh: 'Mental health' };
// Signs of being under 18 pause the account until the member confirms their age (Rusty, 29 Oct 2026).
const AGE = "User is for adults, so this message wasn't sent. Please confirm you are 18 or older to carry on.";
const AGE_REVIEW = "User is for adults, so this message wasn't sent. Your account is paused while it is reviewed.";

serve(async (me, b) => {
  const kind = b.kind === 'room' ? 'room' : 'chat', to = String(b.to || ''), text = String(b.text || '').trim();
  if (!to || !text || text.length > 1000) return reply({ ok: false, error: 'length' }, 400);
  const [state] = must(await admin.rpc('member_state', { m: me.id })) as { strikes: number; muted_until: string | null; suspended_until: string | null }[];
  const now = Date.now();
  // 'infinity' (paused while reviewed) isn't a date JavaScript can read, so it's checked by name.
  if (state.suspended_until === 'infinity' || (state.suspended_until && Date.parse(state.suspended_until) > now)) return reply({ ok: false, error: state.suspended_until === 'infinity' ? 'Your account is paused while it is reviewed.' : `Your account is paused until ${until(state.suspended_until)}.` });
  if (state.muted_until && Date.parse(state.muted_until) > now) return reply({ ok: false, error: `You can't send messages until ${until(state.muted_until)}.` });
  const age = must(await admin.from('profiles').select('age_check_at').eq('id', me.id).single()) as { age_check_at: string | null };
  if (age.age_check_at) return reply({ ok: false, error: 'Please confirm you are 18 or older to carry on.', ageCheck: 'ask' });

  let where = 'a one-to-one chat';
  if (kind === 'room') {
    const room = must(await admin.from('rooms').select('name, cat').eq('id', to).maybeSingle()) as { name: string; cat: string } | null;
    if (!room) return reply({ ok: false, error: 'no such room' }, 404);
    where = `a group room called "${room.name}" (type: ${TYPE[room.cat]})`;
  }
  const out = await checkMessage(text, where, state.strikes);
  const delivered = out.action === 'deliver' || out.action === 'help';
  const [log] = must(await admin.from('moderation').insert({
    member: me.id, kind: kind === 'room' ? 'post' : 'message', target: to, body: delivered ? null : text,
    action: out.action, category: out.category, confidence: out.confidence, model: out.model,
  }).select('id')) as { id: number }[];

  if (out.action === 'hold') return reply({ ok: false, error: HELD });
  if (out.action === 'block' && out.category === 'under_18') {
    const step = must(await admin.rpc('flag_under_18', { m: me.id, why: 'their own message' })) as 'ask' | 'review';
    return reply({ ok: false, blocked: step === 'ask' ? AGE : AGE_REVIEW, error: 'Message not sent', ageCheck: step });
  }
  if (out.action === 'block') {
    const step = out.strike ? must(await admin.rpc('add_strike', { m: me.id, cat: out.category, mod_id: log.id })) as string : '';
    return reply({ ok: false, blocked: out.note + (LADDER[step] || ''), error: 'Message not sent' });
  }
  const r = kind === 'room'
    ? await admin.rpc('deliver_post', { author: me.id, room: to, body: text })
    : await admin.rpc('deliver_message', { sender: me.id, name: to, body: text });
  if (r.error) return reply({ ok: false, error: /blocked/.test(r.error.message) ? "You can't message this person." : 'trouble' });
  const row = (r.data as { id: number; created_at: string }[])[0];
  return reply({ ok: true, msg: { id: String(row.id), created_at: row.created_at }, help: out.action === 'help' });
});
