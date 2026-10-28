// Keeps accounts in this browser, like the prototype. Used for the demo and the tests.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { SAMPLE_HANDLES } from '../data/reference';
import { SAMPLES } from '../data/people';
import { score } from '../lib/match';
import { Backend, Profile, blankProfile } from './types';

const KEY = 'user-app-v1';
type Account = { salt: string; hash: string; passkey: boolean; profile: Profile; blocked: string[] };
type Store = { accounts: Record<string, Account>; device: string | null; current: string | null };

const DEMO = 'quietheron';
const demoAccount = (): Account => ({
  salt: '', hash: 'demo', passkey: true, blocked: [],
  profile: {
    username: 'QuietHeron', byline: 'New here. Anxious in person, easier in text. Like slow walks and long books.',
    stage: 'early', looking: ['chat', 'walk', 'pets'], wantsPeer: true, isPeer: false,
    tags: ['I01', 'I02', 'I04', 'D02', 'D03', 'O01', 'M05'],
    vis: { interests: 'everyone', mh: 'matches', subs: 'matches' },
    prefs: { searchable: true, disappearing: false, lock: false }, setupDone: true,
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
    async signOut() { current = null; },
    async deleteAccount() {
      const s = await load();
      if (current) delete s.accounts[current];
      s.accounts[DEMO] = demoAccount(); // the demo account is restored for testing
      s.device = DEMO; current = null; await save(s);
    },
  };
}
