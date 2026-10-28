// Matching and Search, copied from prototype/index.html (jac, stageCompat, lookFit, match, whyMatched, renderResults).
// The server works out the same score in SQL (supabase/migrations/20261029000000_matching.sql); keep the two in step.
import { CatKey, LOOKING, PATHS, PathKey, REF, TAG_CAT } from '../data/reference';
import type { Profile } from '../backend/types';

// Another member as you see them. `tags` holds only the tags they let you see; `pct` is the match score.
export type Member = {
  username: string; isPeer: boolean; wantsPeer: boolean; region: string; active: string;
  stage: string; tags: string[]; looking: string[]; byline: string; pct: number;
};
type Them = Pick<Member, 'isPeer' | 'wantsPeer' | 'stage' | 'tags' | 'looking'>;

const STAGE_ORDER = ['using', 'thinking', 'cutting', 'quit', 'early3', 'early6', 'early', 'long'];
const DRUGS: CatKey[] = ['meds', 'subs', 'other'];

function jac(a: string[], b: string[]) {
  const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return null;
  let i = 0; A.forEach(x => { if (B.has(x)) i++; }); return i / (A.size + B.size - i);
}
function stageCompat(a: string, b: string) {
  if (a === 'na' || b === 'na') return 0.5;
  if (a === 'help' || b === 'help') return a === b ? 0.6 : 0.85; // helpers suit anyone who wants support
  if (a === 'support' || b === 'support') return a === b ? 1 : 0.5;
  const i = STAGE_ORDER.indexOf(a), j = STAGE_ORDER.indexOf(b); return Math.max(0, 1 - Math.abs(i - j) * 0.15);
}
// "Looking for" fit: what share of one list the other person can meet. Mentor and mentee complement each other.
const LOOK_PAIRS: Record<string, string[]> = { mentor: ['mentoring'], mentoring: ['mentor'], listen: ['chat', 'checkin', 'night'], chat: ['listen'] };
export const meets = (want: string, offer: string[]) => offer.includes(want) || (LOOK_PAIRS[want] || []).some(x => offer.includes(x));
const lookFit = (mine: string[], theirs: string[]) => (mine.length ? mine.filter(l => meets(l, theirs)).length / mine.length : 0);

// Interests 35%, mental health 20%, drug use 20%, stage 10%, looking for 15%, plus the peer support boost. At most 99.
export function score(me: Profile, p: Them) {
  const mine = (cats: CatKey[]) => me.tags.filter(t => cats.includes(TAG_CAT[t])), theirs = (cats: CatKey[]) => p.tags.filter(t => cats.includes(TAG_CAT[t]));
  const parts: [number, number | null][] = [
    [0.35, jac(mine(['interests']), theirs(['interests']))], [0.2, jac(mine(['mh']), theirs(['mh']))],
    [0.2, jac(mine(DRUGS), theirs(DRUGS))], [0.1, stageCompat(me.stage, p.stage)],
    [0.15, me.looking.length ? lookFit(me.looking, p.looking) : null]];
  let w = 0, s = 0; parts.forEach(([wt, v]) => { if (v !== null) { w += wt; s += wt * v; } });
  // Peer support: people who want it are matched with peer supporters (and the other way round).
  const boost = (me.wantsPeer && p.isPeer ? 0.12 : 0) + (me.isPeer && p.wantsPeer ? 0.08 : 0);
  return Math.min(99, Math.round((w ? s / w : 0) * 100 + boost * 100));
}

export const shared = (me: Profile, m: Member) => m.tags.filter(t => me.tags.includes(t));

export function whyMatched(me: Profile, m: Member) {
  const both = shared(me, m), bits: string[] = [];
  const label = (id: string) => LOOKING.find(x => x.id === id)!.label.toLowerCase();
  const si = both.filter(t => TAG_CAT[t] === 'interests').map(t => tagLabel(t).toLowerCase());
  if (si.length) bits.push('you both like ' + si.slice(0, 2).join(' and '));
  if (both.some(t => TAG_CAT[t] === 'mh')) bits.push('you share a mental health experience');
  if (both.some(t => DRUGS.includes(TAG_CAT[t]))) bits.push('you have a similar substance history');
  const lk = m.looking.filter(l => me.looking.includes(l)).map(label);
  if (lk.length) bits.push("you're both looking for " + lk[0].replace(/^an? /, 'a '));
  if (me.wantsPeer && m.isPeer) bits.push('they are a peer supporter and you asked for peer support');
  if (me.isPeer && m.wantsPeer) bits.push('they would like peer support');
  return bits.length ? 'Matched because ' + bits.join(', ') + '.' : 'A different perspective can help too.';
}

const LABELS: Record<string, string> = {};
Object.values(REF).forEach(list => list.forEach(t => { LABELS[t.id] = t.label; }));
export const tagLabel = (id: string) => LABELS[id] || id;
export const groupOf = (id: string): 'int' | 'drug' | 'mh' => (TAG_CAT[id] === 'interests' ? 'int' : TAG_CAT[id] === 'mh' ? 'mh' : 'drug');

// What the Search page asks for. `applied` is the last search run with the Search button.
export type Query = { cats: PathKey[]; f: string[]; look: string[]; peerOnly: boolean };
export const blankQuery = (): Query => ({ cats: ['interests', 'drugs', 'mh'], f: [], look: [], peerOnly: false });
export const sameQuery = (a: Query, b: Query) => {
  const k = (q: Query) => JSON.stringify([[...q.cats].sort(), [...q.f].sort(), [...q.look].sort(), q.peerOnly]);
  return k(a) === k(b);
};

// Within a choice any pick counts; every choice used must match. Looking for keeps people who meet at least one pick
// and ranks those who meet more first; then the match score decides.
export function search(list: Member[], q: Query) {
  let out = list.map(m => ({ m, fit: 0 }));
  PATHS.filter(g => q.cats.includes(g.key)).forEach(g => {
    const picks = q.f.filter(t => g.cats.includes(TAG_CAT[t]));
    if (picks.length) out = out.filter(({ m }) => picks.some(t => m.tags.includes(t)));
  });
  if (q.look.length) out = out.filter(({ m }) => q.look.some(l => meets(l, m.looking))).map(x => ({ ...x, fit: q.look.filter(l => meets(l, x.m.looking)).length }));
  if (q.peerOnly) out = out.filter(({ m }) => m.isPeer);
  return out.sort((a, b) => (b.fit - a.fit) || (b.m.pct - a.m.pct)).map(x => x.m);
}
