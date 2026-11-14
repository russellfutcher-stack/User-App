// A member asks for a review. Body: { topic, text }. Returns the case straight away; it's decided a moment later.
import { admin, must, recent, reply, serve } from '../_shared/db.ts';
import { decideReview } from '../_shared/reviews.ts';
import { alert } from '../_shared/alert.ts';

const TOPICS = ['A message that was blocked', 'A report I made', 'A report about me', 'A room request', 'Something else'];
const ONCE = "You've already asked for a review of this decision. Each decision can be reviewed once, and that review is final.";

// The decision a review is about: the member's latest blocked message, report, report about them or refused room request.
// 'Something else' (usually a question) isn't a decision, so it can be asked more than once.
async function decisionFor(me: string, topic: string): Promise<string | null> {
  const latest = async (q: PromiseLike<{ data: { id: number }[] | null }>) => ((await q).data || [])[0]?.id;
  let id: number | undefined;
  if (topic === 'A message that was blocked') id = await latest(admin.from('moderation').select('id').eq('member', me).eq('action', 'block').order('created_at', { ascending: false }).limit(1));
  else if (topic === 'A report I made') id = await latest(admin.from('reports').select('id').eq('reporter', me).order('created_at', { ascending: false }).limit(1));
  else if (topic === 'A report about me') id = await latest(admin.from('reports').select('id').eq('reported', me).order('created_at', { ascending: false }).limit(1));
  else if (topic === 'A room request') id = await latest(admin.from('moderation').select('id').eq('member', me).eq('kind', 'room_request').eq('action', 'refuse').order('created_at', { ascending: false }).limit(1));
  return id ? `${topic}:${id}` : null;
}

serve(async (me, b) => {
  const topic = String(b.topic || ''), text = String(b.text || '').trim();
  if (!TOPICS.includes(topic)) return reply({ ok: false, error: 'bad topic' }, 400);
  if (text.length < 10 || text.length > 500) return reply({ ok: false, error: 'Please describe what happened in at least 10 characters.' });
  if (await recent('reviews', 'member', me.id, 24) >= 10) return reply({ ok: false, error: "You've asked for a lot of reviews today. Please try again tomorrow." });
  // Each decision can be reviewed once only (Rusty, 14 Nov 2026): the review records which decision it's about.
  const about = await decisionFor(me.id, topic);
  if (about) {
    const { count } = await admin.from('reviews').select('id', { count: 'exact', head: true }).eq('member', me.id).eq('about', about);
    if (count) return reply({ ok: false, error: ONCE });
  }
  const ins = await admin.from('reviews').insert({ member: me.id, topic, body: text, about }).select('id, topic, body, auto, status, due_at');
  if (ins.error) return reply({ ok: false, error: /reviews_once/.test(ins.error.message) ? ONCE : 'trouble' });
  const [c] = ins.data as Record<string, unknown>[];
  const who = must(await admin.from('profiles').select('username').eq('id', me.id).single()) as { username: string };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(Promise.all([
    decideReview(c.id as string).catch(e => console.error(e)),
    // An email to whoever runs User, with the username and what they wrote (Rusty, 14 Nov 2026).
    alert(`User: review ${c.id} from ${who.username}`, `${who.username} asked for a review in User: ${c.id} (${topic}).\n\nWhat they wrote:\n${text}\n\nIt is answered and closed automatically within a minute. You can read it, and change the answer, on the arbitrator dashboard.`).catch(e => console.error(e)),
  ]));
  return reply({ ok: true, review: c });
});
