// Reviews: the topics, and the demo's automatic decisions, copied from prototype/index.html (humanReview, aiReview).
// On the real server the review check on Supabase decides instead (supabase/functions/review).
import { HARD } from './safety';

export const REVIEW_TOPICS = ['A message that was blocked', 'A report I made', 'A report about me', 'A room request', 'Something else'] as const;
export const REPORT_REASONS = ['Offering or asking for drugs', 'Harassment or hate', 'Pressuring me to meet or share details', 'Seems to be in danger', 'Spam or scam', 'Under 18', 'Something else'] as const;
export const URGENT_REASON = /danger|Under 18/;
// At or above this confidence a decision is final; below it, the safest outcome is kept and the case is flagged for the arbitrator.
export const SURE = 0.85;

export type Decision = { decision: 'Upheld' | 'Overturned' | 'Action changed'; confidence: number; reason: string; note: string; flagged: boolean };

export function demoDecision(topic: string, text: string): Decision {
  const t = (topic + ' ' + text).toLowerCase();
  let r: Omit<Decision, 'flagged'>;
  if (/danger/.test(t)) r = {decision: 'Action changed', confidence: .9, reason: 'Possible risk to life. Help now and local crisis lines were shown to the member at once, a supportive check-in message was sent, and their recent messages were reviewed for further risk.', note: 'Reviewed automatically and urgently: support and crisis lines have been offered. Thank you for reporting.'};
  else if (/under 18|under-18/.test(t)) r = {decision: 'Action changed', confidence: .88, reason: 'Signs the member may be under 18. Their account is paused and they have been asked to confirm their age. It is removed if they don\'t confirm within 7 days.', note: 'Reviewed automatically: the account has been paused while age is checked. Thank you for reporting.'};
  else if (/removal/.test(t)) r = {decision: 'Action changed', confidence: .9, reason: '3 or more blocked dealing messages in 7 days. Under the strike ladder this means removal. The account has been removed and the member told which rule they broke.', note: 'Reviewed automatically: the account has been removed for repeated dealing.'};
  else if (/naloxone|recovery|stay clean|help others|harm reduction|used to sell|used to deal|support group|test strips/.test(t)&&!HARD.test(text)) r = {decision: 'Overturned', confidence: .93, reason: 'Recovery or harm-reduction context, with no buying, selling, prices or contact details.', note: 'Reviewed automatically: your message was about recovery or harm reduction, which is allowed. The block has been removed.'};
  else if (/blocked/.test(t)&&HARD.test(text)) r = {decision: 'Upheld', confidence: .91, reason: 'The message includes prices, links or other apps\' contact details.', note: 'Reviewed automatically: the message included prices, links or other apps\' details, which aren\'t allowed.'};
  else if (/offering drugs|spam/.test(t)) r = {decision: 'Upheld', confidence: .95, reason: 'Messages match the report and earlier blocks.', note: 'Reviewed automatically: the report was upheld and action was taken.'};
  else if (/report i made/.test(t)) r = {decision: 'Upheld', confidence: .87, reason: 'The reported messages break the community agreement.', note: 'Reviewed automatically: thank you, the report was upheld.'};
  else if (/stop|keeps|harass/.test(t)) r = {decision: 'Action changed', confidence: .8, reason: 'Unwanted repeated contact. The other member has been muted for 24 hours and warned.', note: 'Reviewed automatically: the other member has been warned and muted for 24 hours. You can also block them.'};
  else r = {decision: 'Upheld', confidence: .6, reason: 'Not enough detail to change the decision, so the safest outcome was kept.', note: 'Reviewed automatically: we couldn\'t confirm the message was safe, so the decision stays. It will be checked again.'};
  return { ...r, flagged: r.confidence < SURE };
}
