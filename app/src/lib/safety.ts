// Message checks, copied from prototype/index.html (DEALING, RECOVERY, HARD, CRISIS).
// These simple rules stand in until the safety check runs on the server in step 4.
export const DEALING = /(\b(sell|selling|sold|for sale|plug|supplier|supply you|re-?up|hook (me|you) up|sort (me|you) out|got any|anyone holding|holding|gram|grams|\d+\s?g\b|half ?o|ounce|oz\b|eighth|price|how much for|deliver|drop ?off|cash ?app|venmo|paypal|bitcoin|crypto|telegram|wickr|whats ?app|snap ?chat|kik|dm me on|insta(gram)?)\b)|[$£€]\s?\d+|https?:\/\/|www\.|🔌|❄️|💊|🍃|🍁|💉|🧊|❄/i;
// Recovery and harm-reduction context: "I used to sell", "I never deal", "naloxone". Allowed unless it also has prices, links, other apps or drug emojis.
const RECOVERY = /\b(used to|use to|stopped|quit|gave up|no longer|never|don'?t|won'?t|not)\s+(sell|selling|deal|dealing|supply|supplying)\b|\bnaloxone\b|\bharm reduction\b/i;
export const HARD = /[$£€]\s?\d+|https?:|www\.|\b(telegram|wickr|whats ?app|snap ?chat|kik)\b|🔌|💊|❄|💉/i;
// Allowed words (Rusty, 12 Nov 2026). The owner's list, kept in the database table public.safety_allowed, which the
// server reads; ALLOWED is the same starting list, used by the demo. A message is never blocked just for these words.
// 'link' allows web links. Each word also matches with spaces inside it ("whats app") and any letter case.
export const ALLOWED = ['cost', 'price', 'sell', 'sold', 'buy', 'link',
  'whatsapp', 'snapchat', 'telegram', 'wickr', 'kik', 'instagram', 'insta', 'signal', 'facebook', 'messenger', 'tiktok'];
const LINKS = /https?:\/\/\S*|www\.\S*/gi;
const term = (w: string) => new RegExp('\\b' + [...w.replace(/\s+/g, '')].map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s?') + '\\b', 'gi');
// The text with every allowed word (and, for 'link', every web link) taken out, so the filter never sees them.
export const withoutAllowed = (t: string, allowed: string[] = ALLOWED) =>
  allowed.reduce((s, w) => (w.trim().toLowerCase() === 'link' ? s.replace(LINKS, ' ') : w.trim() ? s.replace(term(w.trim()), ' ') : s), t);
export const notAllowed = (text: string, allowed: string[] = ALLOWED) => {
  const t = withoutAllowed(text, allowed);
  return DEALING.test(t) && !(RECOVERY.test(t) && !HARD.test(t));
};
export const CRISIS = /(kill myself|suicid|end it all|want to die|don'?t want to (be here|live|wake up)|better off without me|overdos|\bod\b|took too many|self[- ]?harm|hurt myself|cutting myself)/i;
