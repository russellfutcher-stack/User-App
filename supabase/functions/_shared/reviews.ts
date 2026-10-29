// The review check (AI-agents-spec.md, section 3.6): every review is decided automatically, at high effort.
// At 85% confidence or more the decision is final unless the arbitrator changes it; below that the safest outcome is kept
// and the case is flagged for the arbitrator.
import { CAREFUL, decide, quote, REVIEW_SCHEMA, ReviewCheck } from './claude.ts';
import { admin, must } from './db.ts';
import { REVIEW_POLICY } from './policy.ts';

const SURE = 0.85;
const UNSURE_NOTE = "Reviewed automatically: we couldn't confirm the message was safe, so the decision stays. It will be checked again.";

export async function decideReview(id: string) {
  const c = must(await admin.from('reviews').select('*').eq('id', id).single()) as { id: string; member: string; topic: string; body: string; urgent: boolean };
  // Related records, as data: the member's recent blocked messages or reports, never anyone's identity.
  let related = '';
  if (c.topic === 'A message that was blocked') {
    const rows = must(await admin.from('moderation').select('body, category').eq('member', c.member).eq('action', 'block').order('created_at', { ascending: false }).limit(3)) as { body: string; category: string }[];
    related = rows.map(r => `Blocked as ${r.category}: ${r.body}`).join('\n');
  } else if (c.topic === 'A report I made') {
    const rows = must(await admin.from('reports').select('reason, outcome').eq('reporter', c.member).order('created_at', { ascending: false }).limit(3)) as { reason: string; outcome: string }[];
    related = rows.map(r => `Report: ${r.reason}. Outcome: ${r.outcome || 'pending'}`).join('\n');
  } else if (c.topic === 'A report about me' || c.topic === 'Account removal proposed') {
    const rows = must(await admin.from('reports').select('reason, outcome').eq('reported', c.member).order('created_at', { ascending: false }).limit(5)) as { reason: string; outcome: string }[];
    const strikes = must(await admin.from('strikes').select('category').eq('member', c.member)) as { category: string }[];
    related = rows.map(r => `Report about them: ${r.reason}. Outcome: ${r.outcome || 'pending'}`).join('\n') + `\nStrikes: ${strikes.map(s => s.category).join(', ') || 'none'}`;
  }
  const input = `${quote('review', `Topic: ${c.topic}${c.urgent ? ' (urgent)' : ''}\nWhat the member wrote: ${c.body}`)}\n${quote('related', related || '(nothing related on record)')}\nDecide this review.`;
  const r = await decide<ReviewCheck>({ model: CAREFUL, effort: 'high', policy: REVIEW_POLICY, input, schema: REVIEW_SCHEMA });
  let v = r?.value, flagged = !v || v.confidence < SURE;
  if (!v) v = { decision: 'Upheld', confidence: 0, reason: 'The check could not decide.', member_note: UNSURE_NOTE };
  else if (flagged && v.decision === 'Overturned') v = { ...v, decision: 'Upheld', member_note: UNSURE_NOTE }; // keep the safest outcome
  await admin.from('reviews').update({ status: 'Decided: ' + v.decision, decision: v.decision, confidence: v.confidence, reason: v.reason, note: v.member_note,
    flagged, decided_by: 'automatic', decided_at: new Date().toISOString() }).eq('id', c.id);
  await admin.from('moderation').insert({ member: c.member, kind: 'review', target: c.id, action: v.decision, confidence: v.confidence, reason: v.reason, model: r?.model });
  // An overturned block takes back the strike it gave.
  if (v.decision === 'Overturned' && c.topic === 'A message that was blocked') {
    const s = must(await admin.from('strikes').select('id').eq('member', c.member).not('moderation_id', 'is', null).order('created_at', { ascending: false }).limit(1)) as { id: number }[];
    if (s.length) await admin.from('strikes').delete().eq('id', s[0].id);
  }
  if (v.decision === 'Overturned' && c.topic === 'A report about me') await admin.from('profiles').update({ muted_until: null }).eq('id', c.member);
}
