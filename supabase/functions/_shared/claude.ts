// Asks Claude for a decision as JSON that matches a schema. The policy goes first in `system` and is cached.
// Claude Haiku 5.5 makes the quick first check; anything unclear goes to Claude Opus 5.5 (Rusty, 29 Oct 2026).
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

export const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the function's secrets
export const FIRST = 'claude-haiku-5-5';
export const CAREFUL = 'claude-opus-5-5';
export type Effort = 'low' | 'medium' | 'high';

// `null` means Claude declined to answer (a safety refusal) or the answer didn't parse: treat it as unchecked, never as approved.
export async function decide<T>(o: { model: string; effort: Effort; policy: string; input: string; schema: Record<string, unknown> }): Promise<{ value: T; model: string } | null> {
  const params = {
    model: o.model,
    max_tokens: 4000,
    output_config: { effort: o.effort, format: { type: 'json_schema', schema: o.schema } },
    system: [{ type: 'text', text: o.policy, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: o.input }],
  };
  // Opus can hand a refused request to Anthropic's recommended fallback model inside the same call; Haiku can't.
  const res = o.model === CAREFUL
    // deno-lint-ignore no-explicit-any
    ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as any)
    // deno-lint-ignore no-explicit-any
    : await client.messages.create(params as any);
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return null;
  // deno-lint-ignore no-explicit-any
  const text = (res.content as any[]).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return { value: JSON.parse(text) as T, model: res.model }; } catch { return null; }
}

// Member text goes inside tags, marked as data. Tags in the text itself are neutralised so it can't close them.
export const quote = (tag: string, text: string) => `<${tag}>\n${text.replace(/<\/?[a-z_]+>/gi, m => m.replace('<', '‹').replace('>', '›'))}\n</${tag}>`;

export const MESSAGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['decision', 'category', 'confidence', 'user_message', 'strike'],
  properties: {
    decision: { type: 'string', enum: ['deliver', 'block', 'deliver_with_help', 'hold'] },
    category: { type: 'string', enum: ['none', 'dealing', 'off_app_contact', 'harassment', 'hate', 'sexual', 'self_harm_risk', 'overdose_risk', 'spam', 'under_18', 'other'] },
    confidence: { type: 'number' },
    user_message: { type: 'string' },
    strike: { type: 'boolean' },
  },
};
export type MessageCheck = { decision: 'deliver' | 'block' | 'deliver_with_help' | 'hold'; category: string; confidence: number; user_message: string; strike: boolean };

export const REPORT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['outcome', 'confidence', 'reason', 'reporter_note'],
  properties: { outcome: { type: 'string', enum: ['no_action', 'warn', 'mute', 'remove'] }, confidence: { type: 'number' }, reason: { type: 'string' }, reporter_note: { type: 'string' } },
};
export type ReportCheck = { outcome: 'no_action' | 'warn' | 'mute' | 'remove'; confidence: number; reason: string; reporter_note: string };

export const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['decision', 'confidence', 'reason', 'member_note'],
  properties: { decision: { type: 'string', enum: ['Upheld', 'Overturned', 'Action changed'] }, confidence: { type: 'number' }, reason: { type: 'string' }, member_note: { type: 'string' } },
};
export type ReviewCheck = { decision: 'Upheld' | 'Overturned' | 'Action changed'; confidence: number; reason: string; member_note: string };

export const ROOM_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['decision', 'type', 'reason', 'welcome_message'],
  properties: { decision: { type: 'string', enum: ['approve', 'refuse'] }, type: { type: 'string', enum: ['interests', 'drugs', 'mh'] }, reason: { type: 'string' }, welcome_message: { type: 'string' } },
};
export type RoomCheck = { decision: 'approve' | 'refuse'; type: 'interests' | 'drugs' | 'mh'; reason: string; welcome_message: string };
