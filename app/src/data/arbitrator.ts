// The arbitrator dashboard's sample figures and cases for the demo, copied from prototype/index.html (ARB).
// On the real server the figures and cases are live (supabase/migrations/20261102000001_arbitrator.sql).
import type { ArbFigures } from '../backend/types';

export const SAMPLE_FIGURES: ArbFigures = { "sample": true, "activeToday": 1284, "activeWeek": 4912, "newMembers": 318, "peers": 146, "wantPeers": 1037, "checked": 182406, "blocked": 1912, "help": 214, "held": 3, "blockedBy": [ [ "Buying or selling drugs", 1104 ], [ "Links and other apps", 412 ], [ "Harassment", 203 ], [ "Spam or scam", 141 ], [ "Hate", 52 ] ], "reports": [ [ "Offering or asking for drugs", 96 ], [ "Harassment or hate", 71 ], [ "Spam or scam", 45 ], [ "Pressuring me to meet or share details", 38 ], [ "Something else", 30 ], [ "Seems to be in danger", 22 ], [ "Under 18", 9 ] ], "blocksWeek": 263, "muted": 41, "suspended": 12, "ageChecks": 0, "topBlocked": [ [ "GreyFalcon", 11, 4 ], [ "SwiftRaven", 7, 2 ], [ "DustyPike", 5, 0 ] ], "countries": [ [ "United Kingdom", 1842 ], [ "United States", 1206 ], [ "Australia", 611 ], [ "Canada", 437 ], [ "Ireland", 288 ], [ "New Zealand", 174 ], [ "South Africa", 121 ], [ "Other countries", 433 ] ], "peerChats": 517, "rooms": 15, "roomsApproved": 9, "roomsRefused": 4, "autoDecided": 87, "reviewsWeek": 100, "autoSeconds": 41, "changedByArbitrator": 6, "overdue": 0, "missed": 0 };

export const SAMPLE_CASES: { id: string; topic: string; raised: 'Automatic' | 'Member'; due: string; urgent?: boolean; text: string }[] = [
  {"id":"HR-0991","topic":"Report: seems to be in danger","raised":"Automatic","due":"Today, 6pm","urgent":true,"text":"A member wrote that they had taken too many pills. Help was shown to them straight away. The report asks for a check that the right support was offered."},
  {"id":"HR-0989","topic":"Report: may be under 18","raised":"Automatic","due":"Today, 9pm","urgent":true,"text":"Two reports say a member mentioned being in Year 10 at school."},
  {"id":"HR-0985","topic":"Account removal proposed","raised":"Automatic","due":"Tomorrow","text":"GreyFalcon has 3 blocked dealing messages in 7 days and 4 reports. The automatic checks propose removing the account."},
  {"id":"HR-0983","topic":"Appeal: checks disagreed","raised":"Automatic","due":"Tue 27 Oct","text":"A message saying \"I used to sell, now I help others stay clean\" was blocked. On appeal, the re-check allowed it."},
  {"id":"HR-0978","topic":"A message that was blocked","raised":"Member","due":"Wed 28 Oct","text":"\"My message about my naloxone training was blocked and I don't know why.\""},
  {"id":"HR-0976","topic":"Report: offering drugs","raised":"Member","due":"Wed 28 Oct","text":"A member reported SwiftRaven for asking \"who has bars tonight?\" in Taper Together."},
  {"id":"HR-0974","topic":"A message that was blocked","raised":"Member","due":"Wed 28 Oct","text":"\"I only said message me on Telegram for the group chat.\""},
  {"id":"HR-0971","topic":"Report: spam","raised":"Member","due":"Thu 29 Oct","text":"An account posted the same advert in 6 rooms."},
  {"id":"HR-0968","topic":"Something else","raised":"Member","due":"Thu 29 Oct","text":"\"Someone keeps replying to me in every room even though I asked them to stop.\""},
];
