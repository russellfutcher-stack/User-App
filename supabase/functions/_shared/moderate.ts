// The safety check for every chat message and room post (AI-agents-spec.md, section 3.1):
// 1. the fast rule filter, 2. Claude Haiku 5.5 at low effort, 3. Claude Opus 5.5 at medium effort for anything unclear.
import { CAREFUL, decide, FIRST, MESSAGE_SCHEMA, MessageCheck, quote } from './claude.ts';
import { POLICY } from './policy.ts';
import { CRISIS, HARD, notAllowed, withoutAllowed } from './safety.ts';
import { admin } from './db.ts';

// The owner's allowed words (public.safety_allowed), read at most once a minute. If it can't be read, nothing extra is allowed.
let allowedCache: { at: number; terms: string[] } | null = null;
export async function allowedTerms(): Promise<string[]> {
  if (allowedCache && Date.now() - allowedCache.at < 60e3) return allowedCache.terms;
  const { data, error } = await admin.from('safety_allowed').select('term');
  if (error) { console.error('allowed words not read', error.message); return allowedCache?.terms || []; }
  allowedCache = { at: Date.now(), terms: (data as { term: string }[]).map(r => r.term) };
  return allowedCache.terms;
}
// Shown to Claude with every check, as the owner's list (never the member's).
export const allowedNote = (terms: string[]) => quote('allowed_terms', terms.length ? terms.join(', ') : '(none)');

export const NOT_SENT = "It looks like it could be about buying, selling or sourcing drugs, or sharing payment details. User doesn't allow that, to keep everyone safe. If you're struggling with cravings, the Help button has people to talk to right now.";
export type Outcome = { action: 'deliver' | 'help' | 'block' | 'hold'; category: string; confidence: number; note: string; strike: boolean; model: string };

export async function checkMessage(text: string, where: string, strikes: number): Promise<Outcome> {
  const allowed = await allowedTerms();
  if (notAllowed(text, allowed)) {
    const contact = /https?:|www\.|telegram|wickr|whats ?app|snap ?chat|kik|insta|cash ?app|venmo|paypal|bitcoin|crypto/i.test(withoutAllowed(text, allowed));
    return { action: 'block', category: contact ? 'off_app_contact' : 'dealing', confidence: 1, note: NOT_SENT, strike: false, model: 'rules' };
  }
  const input = `${allowedNote(allowed)}\n${quote('context', `Where: ${where}\nThe sender's strikes in the last 30 days: ${strikes}`)}\n${quote('message', text)}\nCheck this message.`;
  let r = await decide<MessageCheck>({ model: FIRST, effort: 'low', policy: POLICY, input, schema: MESSAGE_SCHEMA });
  if (!r || r.value.decision === 'hold' || r.value.confidence < 0.6) // unclear: a careful re-check before delivery
    r = await decide<MessageCheck>({ model: CAREFUL, effort: 'medium', policy: POLICY, input, schema: MESSAGE_SCHEMA });
  if (!r || r.value.decision === 'hold' || r.value.confidence < 0.6)
    return { action: 'hold', category: r?.value.category || 'other', confidence: r?.value.confidence || 0, note: '', strike: false, model: r?.model || CAREFUL };
  const v = r.value;
  if (v.decision === 'block') return { action: 'block', category: v.category, confidence: v.confidence, note: v.user_message || NOT_SENT, strike: v.strike && ['dealing', 'harassment', 'hate'].includes(v.category), model: r.model };
  // Crisis words always open the Help sheet, even if the check didn't flag them.
  const help = v.decision === 'deliver_with_help' || CRISIS.test(text);
  return { action: help ? 'help' : 'deliver', category: v.category, confidence: v.confidence, note: '', strike: false, model: r.model };
}
export { HARD };
