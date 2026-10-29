// Keeps accounts in this browser, like the prototype. Used for the demo and the tests.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { SAMPLE_HANDLES } from '../data/reference';
import { SAMPLES } from '../data/people';
import { DEMO_CHATS, DEMO_JOINED, ROOMS, repliesFor } from '../data/community';
import { score } from '../lib/match';
import { roomRequestError } from '../lib/rooms';
import { demoDecision, Decision, URGENT_REASON } from '../lib/review';
import { CRISIS, notAllowed } from '../lib/safety';
import { AgeCheck, Backend, Msg, Profile, Review, Room, RoomRequest, Sent, blankProfile } from './types';

const KEY = 'user-app-v1';
type Stored = { f: 'me' | 'them'; t: string; ts: number };
type Chat = { msgs: Stored[]; unread: boolean };
type MyRoom = { id: string; cat: Room['cat']; name: string; desc: string };
type Rooms = { joined: string[]; posts: Record<string, Stored[]>; custom: MyRoom[]; requests: RoomRequest[] };
type Case = Omit<Review, 'status' | 'note' | 'by'> & { at: number; decision: Decision };
type Account = { salt: string; hash: string; passkey: boolean; profile: Profile; blocked: string[]; chats?: Record<string, Chat>; rooms?: Rooms; cases?: Case[];
  checkin?: boolean; ageCheck?: AgeCheck; ageConfirmed?: boolean };

// In the demo, a review is decided about 1.5 seconds after it's sent, as in the prototype.
const DECIDE_AFTER = 1500;
const dueDate = (urgent: boolean) => new Date(Date.now() + (urgent ? 24 : 72) * 3600000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const asReview = (c: Case): Review => (Date.now() - c.at < DECIDE_AFTER ? { ...c, status: 'Being reviewed' }
  : { ...c, status: 'Decided: ' + c.decision.decision, note: c.decision.note, by: 'automatic' });
// The demo's stand-in for the safety check: the prototype's rules.
const check = (text: string): { blocked: boolean; help: boolean; young: boolean } => ({ blocked: notAllowed(text), help: CRISIS.test(text), young: YOUNG.test(text) });
// Signs of being under 18, such as "I'm 15" or "in Year 10". On the server the safety check spots these instead.
const YOUNG = /\b(i'?m|i am|im) (1[0-7]|[1-9])\b(?! ?(days?|weeks?|months?|years?|hours?|minutes?|mins?|times?|drinks?)\b)|\b(1[0-7]|[1-9]) ?(years? old|yo|y\/o)\b|\bin year ([7-9]|1[01])\b/i;
const AGE = "User is for adults, so this message wasn't sent. Please confirm you are 18 or older to carry on.";
const AGE_REVIEW = "User is for adults, so this message wasn't sent. Your account is paused while it is reviewed.";
const NOT_SENT = "It looks like it could be about buying or selling, or sharing links or other apps' contact details. User doesn't allow sourcing or off-app contact, to keep everyone safe. If you're struggling with cravings, the Help button has people to talk to right now.";
type Store = { accounts: Record<string, Account>; device: string | null; current: string | null };

const DEMO = 'quietheron';
const demoAccount = (): Account => ({
  salt: '', hash: 'demo', passkey: true, blocked: [],
  chats: Object.fromEntries(DEMO_CHATS.map(c => [c.with, { unread: c.unread, msgs: c.msgs.map(([f, t, ago]) => ({ f, t, ts: Date.now() - ago })) }])),
  rooms: { joined: [...DEMO_JOINED], posts: {}, custom: [], requests: [] },
  profile: {
    username: 'QuietHeron', byline: 'New here. Anxious in person, easier in text. Like slow walks and long books.',
    stage: 'early', looking: ['chat', 'walk', 'pets'], wantsPeer: true, isPeer: false,
    tags: ['I01', 'I02', 'I04', 'D02', 'D03', 'O01', 'M05'],
    vis: { interests: 'everyone', mh: 'matches', subs: 'matches' },
    prefs: { searchable: true, disappearing: false, lock: false }, setupDone: true, country: '',
  },
});

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const newSalt = () => hex(Crypto.getRandomBytes(16)); // 32 characters
const hash = (password: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + password);

async function load(): Promise<Store> {
  let s: Store | null = null;
  try { const raw = await AsyncStorage.getItem(KEY); s = raw ? JSON.parse(raw) : null; } catch { s = null; }
  s = s || { accounts: {}, device: null, current: null };
  if (!s.accounts[DEMO]) s.accounts[DEMO] = demoAccount();
  if (!s.device) s.device = DEMO;
  return s;
}
async function save(s: Store) { try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }

export function localBackend(): Backend {
  // The app always opens signed out, so the signed-in account lives in memory only.
  let current: string | null = null;
  // Changes run one at a time, so quick taps can't overwrite each other.
  let queue: Promise<unknown> = Promise.resolve();
  const withMe = (fn: (a: Account, s: Store) => void) => {
    const run = queue.catch(() => undefined).then(async () => {
      const s = await load(); const a = current && s.accounts[current]; if (!a) return; fn(a, s); await save(s);
    });
    queue = run; return run;
  };
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach(fn => fn());
  const chatsOf = (a: Account) => (a.chats = a.chats || {});
  const roomsOf = (a: Account) => (a.rooms = a.rooms || { joined: [], posts: {}, custom: [], requests: [] });
  const me = async () => { await queue.catch(() => undefined); const s = await load(); return (current && s.accounts[current]) || null; };
  const msg = (m: Stored, i: number, who?: string): Msg => ({ id: String(i), mine: m.f === 'me', text: m.t, at: m.ts, who: m.f === 'me' ? undefined : who });
  const addCase = async (topic: string, text: string, auto: boolean): Promise<Review | null> => {
    const a = await me(); if (!a) return null;
    const c: Case = { id: 'HR-' + (1001 + (a.cases || []).length), topic, text, auto, due: dueDate(auto), at: Date.now(), decision: demoDecision(topic, text) };
    await withMe(x => { x.cases = [c, ...(x.cases || [])]; });
    return asReview(c);
  };
  // Why a message can't be sent, or null. A sign of being under 18 pauses the account until they confirm their age;
  // after confirming once, another sign pauses it for review.
  const refused = async (c: ReturnType<typeof check>): Promise<Sent | null> => {
    const a = await me(); if (!a) return { ok: false, error: 'Please sign in again.' };
    if (a.ageCheck) return { ok: false, error: 'Please confirm you are 18 or older to carry on.', ageCheck: a.ageCheck };
    if (c.blocked) return { ok: false, blocked: NOT_SENT, error: 'Message not sent' };
    if (!c.young) return null;
    const step: AgeCheck = a.ageConfirmed ? 'review' : 'ask';
    await withMe(x => { x.ageCheck = step; });
    return { ok: false, blocked: step === 'ask' ? AGE : AGE_REVIEW, error: 'Message not sent', ageCheck: step };
  };
  const allRooms = (a: Account) => [...ROOMS.map(r => ({ id: r.id, cat: r.cat, name: r.name, desc: r.desc, members: r.members, mine: false })),
    ...roomsOf(a).custom.map(r => ({ ...r, members: 1, mine: true }))];

  return {
    kind: 'local',
    passkeysReady: true,
    async usernameTaken(name) {
      const n = name.toLowerCase(); const s = await load();
      return !!s.accounts[n] || SAMPLE_HANDLES.some(h => h.toLowerCase() === n);
    },
    async signUp(username, password) {
      const s = await load(); const n = username.toLowerCase();
      if (s.accounts[n] || SAMPLE_HANDLES.some(h => h.toLowerCase() === n)) return { ok: false, error: 'That username is taken. Try another, or tap Suggest.' };
      const salt = newSalt();
      s.accounts[n] = { salt, hash: await hash(password, salt), passkey: false, profile: blankProfile(username), blocked: [] };
      s.device = n; current = n; await save(s);
      return { ok: true, value: s.accounts[n].profile };
    },
    async signIn(username, password) {
      const s = await load(); const n = username.trim().toLowerCase(); const a = s.accounts[n];
      const ok = !!a && (a.hash === 'demo' ? password.trim().toLowerCase() === 'quiet heron walks' : (await hash(password, a.salt)) === a.hash);
      if (!ok) return { ok: false, error: "That username and password don't match. Check for typos, or sign in with a passkey." };
      s.device = n; current = n; await save(s);
      return { ok: true, value: a.profile };
    },
    async passkeyAccount() {
      const s = await load(); const a = s.device ? s.accounts[s.device] : null;
      return a && a.passkey ? a.profile.username : null;
    },
    async signInWithPasskey() {
      const s = await load(); const a = s.device ? s.accounts[s.device] : null;
      if (!a || !a.passkey) return { ok: false, error: 'No passkey for User is saved on this device. Sign in with your username and password.' };
      current = s.device; return { ok: true, value: a.profile };
    },
    async hasPasskey() { const s = await load(); return !!(current && s.accounts[current]?.passkey); },
    async setPasskey(on) { await withMe(a => { a.passkey = on; }); return { ok: true, value: null }; },
    async changePassword(currentPass, next) {
      const s = await load(); const a = current && s.accounts[current]; if (!a) return { ok: false, error: 'Please sign in again.' };
      const ok = a.hash === 'demo' ? currentPass.trim().toLowerCase() === 'quiet heron walks' : (await hash(currentPass, a.salt)) === a.hash;
      if (!ok) return { ok: false, error: "That isn't your current password." };
      a.salt = newSalt(); a.hash = await hash(next, a.salt); await save(s); // a fresh salt with every new password
      return { ok: true, value: null };
    },
    async saveProfile(patch) { await withMe(a => { a.profile = { ...a.profile, ...patch }; }); },
    async members() {
      await queue.catch(() => undefined); const s = await load(); const a = current && s.accounts[current]; if (!a) return [];
      return SAMPLES.filter(m => !a.blocked.includes(m.username)).map(m => ({ ...m, pct: score(a.profile, m) }));
    },
    async block(username) { await withMe(a => { if (!a.blocked.includes(username)) a.blocked.push(username); }); },
    async blocked() { const s = await load(); return (current && s.accounts[current]?.blocked) || []; },
    async unblock(username) { await withMe(a => { a.blocked = a.blocked.filter(x => x !== username); }); },
    async chats() {
      const a = await me(); if (!a) return [];
      return Object.entries(chatsOf(a)).filter(([w, c]) => c.msgs.length && !a.blocked.includes(w))
        .map(([w, c]) => ({ with: w, last: msg(c.msgs[c.msgs.length - 1], c.msgs.length - 1), unread: c.unread }))
        .sort((x, y) => y.last.at - x.last.at);
    },
    async messages(w) {
      let out: Msg[] = [];
      await withMe(a => { const c = chatsOf(a)[w]; if (!c) return; c.unread = false; out = c.msgs.map((m, i) => msg(m, i)); });
      return out;
    },
    async send(w, text): Promise<Sent> {
      const c = check(text), no = await refused(c); if (no) return no;
      let out: Msg | null = null;
      await withMe(a => { const c = (chatsOf(a)[w] = chatsOf(a)[w] || { msgs: [], unread: false }); c.msgs.push({ f: 'me', t: text, ts: Date.now() }); out = msg(c.msgs[c.msgs.length - 1], c.msgs.length - 1); });
      return out ? { ok: true, msg: out, help: c.help } : { ok: false, error: 'Please sign in again.' };
    },
    async sampleReply(w) {
      if (!SAMPLES.some(m => m.username === w)) return null;
      let out: Msg | null = null;
      await withMe(a => {
        const c = chatsOf(a)[w]; if (!c || a.blocked.includes(w)) return;
        const replies = repliesFor(w), n = c.msgs.filter(m => m.f === 'them').length;
        c.msgs.push({ f: 'them', t: replies[n % replies.length], ts: Date.now() }); c.unread = true; out = msg(c.msgs[c.msgs.length - 1], c.msgs.length - 1);
      });
      changed(); return out;
    },
    async deleteChat(w) {
      let kept: Chat | undefined;
      await withMe(a => { kept = chatsOf(a)[w]; delete chatsOf(a)[w]; });
      return async () => { await withMe(a => { if (kept) chatsOf(a)[w] = kept; }); };
    },
    onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async rooms() {
      const a = await me(); if (!a) return [];
      const j = roomsOf(a).joined; return allRooms(a).map(r => ({ ...r, joined: j.includes(r.id) }));
    },
    async roomPosts(id) {
      const a = await me(); if (!a) return [];
      const seed = ROOMS.find(r => r.id === id)?.seed || [];
      const mine = roomsOf(a).posts[id] || [];
      const custom = roomsOf(a).custom.find(r => r.id === id);
      return [...(custom ? [{ f: 'them' as const, t: `Welcome to ${custom.name}. This room has just been created. Say hello!`, ts: 0, who: 'User' }] : []),
        ...seed.map(([who, t]) => ({ f: 'them' as const, t, ts: 0, who })), ...mine.map(m => ({ ...m, who: undefined }))]
        .map((m, i) => msg(m, i, m.who));
    },
    async joinRoom(id) { await withMe(a => { const r = roomsOf(a); if (!r.joined.includes(id)) r.joined.push(id); }); },
    async post(id, text): Promise<Sent> {
      const c = check(text), no = await refused(c); if (no) return no;
      let out: Msg | null = null;
      await withMe(a => { const r = roomsOf(a); const l = (r.posts[id] = r.posts[id] || []); l.push({ f: 'me', t: text, ts: Date.now() }); out = msg(l[l.length - 1], 1000 + l.length); });
      return out ? { ok: true, msg: out, help: c.help } : { ok: false, error: 'Please sign in again.' };
    },
    async leaveRoom(id) {
      let was: Rooms | undefined;
      await withMe(a => {
        const r = roomsOf(a); was = JSON.parse(JSON.stringify(r));
        r.joined = r.joined.filter(x => x !== id);
        if (r.custom.some(x => x.id === id)) { r.custom = r.custom.filter(x => x.id !== id); r.requests = r.requests.filter(q => q.id !== id); }
      });
      return async () => { await withMe(a => { if (was) a.rooms = was; }); };
    },
    async roomRequests() { const a = await me(); return a ? roomsOf(a).requests : []; },
    async requestRoom(name, cat, desc) {
      const a = await me(); if (!a) return { ok: false, error: 'Please sign in again.' };
      const err = roomRequestError(name, desc, [...allRooms(a).map(r => r.name), ...roomsOf(a).requests.map(q => q.name)]);
      if (err) return { ok: false, error: err };
      const room: MyRoom = { id: 'c' + Date.now().toString(36), cat, name, desc };
      await withMe(x => { const r = roomsOf(x); r.custom.push(room); r.requests.push({ id: room.id, name, cat, status: 'Approved' }); if (!r.joined.includes(room.id)) r.joined.push(room.id); });
      return { ok: true, value: { ...room, members: 1, joined: true, mine: true } };
    },
    async report(username, reason) {
      const urgent = URGENT_REASON.test(reason);
      if (urgent) await addCase('A report I made', 'Automatic: ' + reason, true); // reviewed urgently, raised automatically
      return { ok: true, value: { urgent } };
    },
    async requestReview(topic, text) {
      const r = await addCase(topic, text, false);
      return r ? { ok: true, value: r } : { ok: false, error: 'Please sign in again.' };
    },
    async reviews() { const a = await me(); return (a?.cases || []).map(asReview); },
    async notices() { const a = await me(); return { checkin: !!a?.checkin, ageCheck: a?.ageCheck || null }; },
    async seenCheckin() { await withMe(a => { delete a.checkin; }); },
    async confirmAge() {
      const a = await me(); if (!a) return { ok: false, error: 'Please sign in again.' };
      if (a.ageCheck !== 'ask') return { ok: false, error: 'Your account is paused while it is reviewed.' };
      await withMe(x => { delete x.ageCheck; x.ageConfirmed = true; }); return { ok: true, value: null };
    },
    async signOut() { current = null; },
    async deleteAccount() {
      const s = await load();
      if (current) delete s.accounts[current];
      s.accounts[DEMO] = demoAccount(); // the demo account is restored for testing
      s.device = DEMO; current = null; await save(s);
    },
  };
}
