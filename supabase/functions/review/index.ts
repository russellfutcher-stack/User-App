// A member asks for a review. Body: { topic, text }. Returns the case straight away; it's decided a moment later.
import { admin, must, recent, reply, serve } from '../_shared/db.ts';
import { decideReview } from '../_shared/reviews.ts';
import { alert } from '../_shared/alert.ts';

const TOPICS = ['A message that was blocked', 'A report I made', 'A report about me', 'A room request', 'Something else'];

serve(async (me, b) => {
  const topic = String(b.topic || ''), text = String(b.text || '').trim();
  if (!TOPICS.includes(topic)) return reply({ ok: false, error: 'bad topic' }, 400);
  if (text.length < 10 || text.length > 500) return reply({ ok: false, error: 'Please describe what happened in at least 10 characters.' });
  if (await recent('reviews', 'member', me.id, 24) >= 10) return reply({ ok: false, error: "You've asked for a lot of reviews today. Please try again tomorrow." });
  const [c] = must(await admin.from('reviews').insert({ member: me.id, topic, body: text }).select('id, topic, body, auto, status, due_at')) as Record<string, unknown>[];
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(Promise.all([
    decideReview(c.id as string).catch(e => console.error(e)),
    // An email to whoever runs User. No username and nothing the member wrote: just the case number and topic.
    alert(`User: review ${c.id} requested`, `A member asked for a review in User: ${c.id} (${topic}).\n\nIt is answered and closed automatically within a minute. You can read it, and change the answer, on the arbitrator dashboard.`).catch(e => console.error(e)),
  ]));
  return reply({ ok: true, review: c });
});
