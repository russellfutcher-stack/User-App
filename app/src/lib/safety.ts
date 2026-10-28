// Message checks, copied from prototype/index.html (DEALING, RECOVERY, HARD, CRISIS).
// These simple rules stand in until the safety check runs on the server in step 4.
export const DEALING = /(\b(sell|selling|sold|for sale|plug|supplier|supply you|re-?up|hook (me|you) up|sort (me|you) out|got any|anyone holding|holding|gram|grams|\d+\s?g\b|half ?o|ounce|oz\b|eighth|price|how much for|deliver|drop ?off|cash ?app|venmo|paypal|bitcoin|crypto|telegram|wickr|whats ?app|snap ?chat|kik|dm me on|insta(gram)?)\b)|[$£€]\s?\d+|https?:\/\/|www\.|🔌|❄️|💊|🍃|🍁|💉|🧊|❄/i;
// Recovery and harm-reduction context: "I used to sell", "I never deal", "naloxone". Allowed unless it also has prices, links, other apps or drug emojis.
const RECOVERY = /\b(used to|use to|stopped|quit|gave up|no longer|never|don'?t|won'?t|not)\s+(sell|selling|deal|dealing|supply|supplying)\b|\bnaloxone\b|\bharm reduction\b/i;
const HARD = /[$£€]\s?\d+|https?:|www\.|\b(telegram|wickr|whats ?app|snap ?chat|kik)\b|🔌|💊|❄|💉/i;
export const notAllowed = (t: string) => DEALING.test(t) && !(RECOVERY.test(t) && !HARD.test(t));
export const CRISIS = /(kill myself|suicid|end it all|want to die|don'?t want to (be here|live|wake up)|better off without me|overdos|\bod\b|took too many|self[- ]?harm|hurt myself|cutting myself)/i;
