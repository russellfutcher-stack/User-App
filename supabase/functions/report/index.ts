// A member reports another member. Body: { username, reason }. Checked straight away; serious reports also raise an urgent review.
import { CAREFUL, decide, quote, REPORT_SCHEMA, ReportCheck } from '../_shared/claude.ts';
import { admin, must, recent, reply, serve } from '../_shared/db.ts';
import { REPORT_POLICY } from '../_shared/policy.ts';
import { decideReview } from '../_shared/reviews.ts';
import { allowedNote, allowedTerms } from '../_shared/moderate.ts';

const REASONS = ['Offering or asking for drugs', 'Harassment or hate', 'Pressuring me to meet or share details', 'Seems to be in danger', 'Spam or scam', 'Under 18', 'Something else'];

serve(async (me, b) => {
  const reason = String(b.reason || ''), username = String(b.username || '');
  if (!REASONS.includes(reason)) return reply({ ok: false, error: 'bad reason' }, 400);
  const urgent = /danger|Under 18/.test(reason);
  // One ordinary report a day; reports that someone is in danger or under 18 can always be made (Rusty, 14 Nov 2026),
  // up to 20 a day in all so nobody can run up the safety check's costs.
  if (await recent('reports', 'reporter', me.id, 24) >= 20) return reply({ ok: false, error: "You've made a lot of reports today. If someone is in danger, call your emergency number." });
  if (!urgent) {
    const { count } = await admin.from('reports').select('id', { count: 'exact', head: true }).eq('reporter', me.id)
      .not('reason', 'in', '("Seems to be in danger","Under 18")').gte('created_at', new Date(Date.now() - 24 * 3600e3).toISOString());
    if ((count || 0) >= 1) return reply({ ok: false, error: "You can make one report a day. If someone seems to be in danger or under 18, you can still report that." });
  }
  const them = must(await admin.rpc('member_id', { name: username })) as string | null;
  if (!them || them === me.id) return reply({ ok: false, error: 'no such member' }, 404);
  const [rep] = must(await admin.from('reports').insert({ reporter: me.id, reported: them, reason }).select('id')) as { id: number }[];
  // Straight away: a danger report sends a check-in; an under-18 report pauses the account until they confirm their age.
  if (reason === 'Seems to be in danger') must(await admin.rpc('flag_danger', { m: them }));
  if (reason === 'Under 18') must(await admin.rpc('flag_under_18', { m: them, why: 'a report' }));
  let review: string | null = null;
  if (urgent) { // reviewed urgently, raised automatically
    const [r] = must(await admin.from('reviews').insert({ member: me.id, subject: them, topic: 'A report I made', body: 'Automatic: ' + reason, auto: true, urgent: true, due_at: new Date(Date.now() + 24 * 3600e3).toISOString() }).select('id')) as { id: string }[];
    review = r.id;
  }
  // The check runs after the reply, so the member isn't kept waiting.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil((async () => {
    const context = must(await admin.rpc('report_context', { reporter: me.id, reported: them })) as { who: string; body: string }[];
    const input = `${allowedNote(await allowedTerms())}\n${quote('report', `Reason chosen: ${reason}`)}\n${quote('messages', context.length ? context.map(m => `${m.who}: ${m.body}`).join('\n') : '(they have not chatted)')}\nReview this report.`;
    const r = await decide<ReportCheck>({ model: CAREFUL, effort: 'medium', policy: REPORT_POLICY, input, schema: REPORT_SCHEMA });
    const outcome = r ? r.value.outcome : 'pending';
    await admin.from('reports').update({ outcome, note: r?.value.reporter_note }).eq('id', rep.id);
    await admin.from('moderation').insert({ member: them, kind: 'report', target: String(rep.id), action: outcome, confidence: r?.value.confidence, reason: r?.value.reason, model: r?.model });
    if (outcome === 'warn') await admin.rpc('add_strike', { m: them, cat: 'report', mod_id: null });
    if (outcome === 'mute') await admin.from('profiles').update({ muted_until: new Date(Date.now() + 24 * 3600e3).toISOString() }).eq('id', them);
    if (outcome === 'remove') {
      await admin.from('profiles').update({ suspended_until: 'infinity' }).eq('id', them);
      await admin.from('reviews').insert({ member: them, topic: 'Account removal proposed', body: 'A report was upheld: ' + reason, auto: true, urgent: true, due_at: new Date(Date.now() + 24 * 3600e3).toISOString() });
    }
    if (review) await decideReview(review);
  })());
  return reply({ ok: true, urgent });
});
