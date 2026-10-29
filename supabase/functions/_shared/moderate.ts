// The safety check for every chat message and room post (AI-agents-spec.md, section 3.1):
// 1. the fast rule filter, 2. Claude Haiku 5.5 at low effort, 3. Claude Opus 5.5 at medium effort for anything unclear.
import { CAREFUL, decide, FIRST, MESSAGE_SCHEMA, MessageCheck, quote } from './claude.ts';
import { POLICY } from './policy.ts';
import { CRISIS, HARD, notAllowed } from './safety.ts';

export const NOT_SENT = "It looks like it could be about buying or selling, or sharing links or other apps' contact details. User doesn't allow sourcing or off-app contact, to keep everyone safe. If you're struggling with cravings, the Help button has people to talk to right now.";
export type Outcome = { action: 'deliver' | 'help' | 'block' | 'hold'; category: string; confidence: number; note: string; strike: boolean; model: string };

export async function checkMessage(text: string, where: string, strikes: number): Promise<Outcome> {
  if (notAllowed(text)) {
    const contact = /https?:|www\.|telegram|wickr|whats ?app|snap ?chat|kik|insta/i.test(text);
    return { action: 'block', category: contact ? 'off_app_contact' : 'dealing', confidence: 1, note: NOT_SENT, strike: false, model: 'rules' };
  }
  const input = `${quote('context', `Where: ${where}\nThe sender's strikes in the last 30 days: ${strikes}`)}\n${quote('message', text)}\nCheck this message.`;
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
