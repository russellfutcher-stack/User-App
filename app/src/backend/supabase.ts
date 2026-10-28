// The real server: Supabase in the Sydney region.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SAMPLE_HANDLES } from '../data/reference';
import { Backend, Member, Profile } from './types';

// Supabase Auth needs an email address, but members never give one. The app makes a
// placeholder from the username. No email is sent ("Confirm email" is off in Supabase).
const EMAIL_DOMAIN = process.env.EXPO_PUBLIC_ACCOUNT_EMAIL_DOMAIN || 'members.user-app.invalid';
const emailFor = (username: string) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

type Row = {
  username: string; byline: string; stage: string; looking: string[]; wants_peer: boolean | null; is_peer: boolean;
  tags: string[]; vis_interests: Profile['vis']['interests']; vis_mh: Profile['vis']['mh']; vis_subs: Profile['vis']['subs'];
  searchable: boolean; disappearing: boolean; app_lock: boolean; setup_done: boolean;
};
const fromRow = (r: Row): Profile => ({
  username: r.username, byline: r.byline, stage: r.stage, looking: r.looking, wantsPeer: r.wants_peer, isPeer: r.is_peer,
  tags: r.tags, vis: { interests: r.vis_interests, mh: r.vis_mh, subs: r.vis_subs },
  prefs: { searchable: r.searchable, disappearing: r.disappearing, lock: r.app_lock }, setupDone: r.setup_done,
});
const toRow = (p: Partial<Profile>): Partial<Row> => {
  const r: Partial<Row> = {};
  if (p.byline !== undefined) r.byline = p.byline;
  if (p.stage !== undefined) r.stage = p.stage;
  if (p.looking !== undefined) r.looking = p.looking;
  if (p.wantsPeer !== undefined) r.wants_peer = p.wantsPeer;
  if (p.isPeer !== undefined) r.is_peer = p.isPeer;
  if (p.tags !== undefined) r.tags = p.tags;
  if (p.vis) { r.vis_interests = p.vis.interests; r.vis_mh = p.vis.mh; r.vis_subs = p.vis.subs; }
  if (p.prefs) { r.searchable = p.prefs.searchable; r.disappearing = p.prefs.disappearing; r.app_lock = p.prefs.lock; }
  if (p.setupDone !== undefined) r.setup_done = p.setupDone;
  return r;
};

const WRONG = "That username and password don't match. Check for typos, or sign in with a passkey.";
const TROUBLE = "Something went wrong reaching User. Check your connection and try again.";
const NO_PASSKEY = 'No passkey for User is saved on this device. Sign in with your username and password.';
const NOT_READY = "Passkeys aren't ready yet. They're coming soon.";

// Passkeys (WebAuthn) work in web browsers. The device keeps the passkey; Supabase keeps only its public half.
// This device remembers which username its passkey belongs to, so sign-in can say "Continue as ...".
const DEVICE_KEY = 'user-app-passkey';
const remember = async (name: string | null) => {
  try { if (name) await AsyncStorage.setItem(DEVICE_KEY, name); else await AsyncStorage.removeItem(DEVICE_KEY); } catch { /* storage unavailable */ }
};
const webAuthnReady = typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
// A cancelled or timed-out device check comes back as the browser's NotAllowedError.
const cancelled = (e: { name?: string; code?: string; cause?: unknown }) =>
  e.code === 'ERROR_CEREMONY_ABORTED' || e.name === 'NotAllowedError' || (e.cause as { name?: string } | undefined)?.name === 'NotAllowedError';

export function supabaseBackend(url: string, anonKey: string): Backend {
  // The app always opens signed out, so the session is not kept after a reload.
  const db = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: true } });
  const myId = async () => (await db.auth.getUser()).data.user?.id;
  const myProfile = async (): Promise<Profile | null> => {
    const id = await myId(); if (!id) return null;
    const { data } = await db.from('profiles').select('*').eq('id', id).single();
    return data ? fromRow(data as Row) : null;
  };
  const must = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
  // Saves run in order, and signing out waits for them, so a quick sign-out doesn't lose a change.
  let saving: Promise<unknown> = Promise.resolve();
  const settled = () => saving.catch(() => undefined);
  // Signing in again waits for any sign-out still finishing, so it can't end the new session.
  let leaving: Promise<unknown> = Promise.resolve();

  return {
    kind: 'supabase',
    passkeysReady: webAuthnReady,
    async usernameTaken(name) {
      if (SAMPLE_HANDLES.some(h => h.toLowerCase() === name.toLowerCase())) return true;
      const { data, error } = await db.rpc('username_taken', { name }); must(error); return !!data;
    },
    async signUp(username, password) {
      await leaving;
      const { data, error } = await db.auth.signUp({ email: emailFor(username), password, options: { data: { username } } });
      if (error) return { ok: false, error: /registered|exists/i.test(error.message) ? 'That username is taken. Try another, or tap Suggest.' : TROUBLE };
      if (!data.session) return { ok: false, error: TROUBLE }; // "Confirm email" is still on in Supabase
      const p = await myProfile(); return p ? { ok: true, value: p } : { ok: false, error: TROUBLE };
    },
    async signIn(username, password) {
      await leaving;
      const { error } = await db.auth.signInWithPassword({ email: emailFor(username), password });
      if (error) return { ok: false, error: error.status === 400 ? WRONG : TROUBLE };
      const p = await myProfile(); return p ? { ok: true, value: p } : { ok: false, error: TROUBLE };
    },
    async passkeyAccount() { try { return await AsyncStorage.getItem(DEVICE_KEY); } catch { return null; } },
    async signInWithPasskey() {
      if (!webAuthnReady) return { ok: false, error: NO_PASSKEY };
      await leaving;
      const { error } = await db.auth.signInWithPasskey();
      if (error) {
        const e = error as { code?: string; status?: number };
        // 400 or 404: the server doesn't know this passkey, for example after it was removed.
        return { ok: false, error: e.code === 'passkey_disabled' ? NOT_READY : cancelled(error) || e.status === 400 || e.status === 404 ? NO_PASSKEY : TROUBLE };
      }
      const p = await myProfile(); if (!p) return { ok: false, error: TROUBLE };
      await remember(p.username); return { ok: true, value: p };
    },
    async hasPasskey() {
      const { data, error } = await db.auth.passkey.list(); return !error && !!data?.length;
    },
    async setPasskey(on) {
      if (on) {
        if (!webAuthnReady) return { ok: false, error: NOT_READY };
        const { error } = await db.auth.registerPasskey();
        if (error) return { ok: false, error: (error as { code?: string }).code === 'passkey_disabled' ? NOT_READY : cancelled(error) ? "The passkey wasn't saved. Try again when you're ready." : TROUBLE };
        await remember((await myProfile())?.username ?? null); return { ok: true, value: null };
      }
      const { data, error } = await db.auth.passkey.list(); if (error) return { ok: false, error: TROUBLE };
      for (const pk of data || []) { const r = await db.auth.passkey.delete({ passkeyId: pk.id }); if (r.error) return { ok: false, error: TROUBLE }; }
      await remember(null); return { ok: true, value: null };
    },
    async changePassword(current, next) {
      const { data } = await db.auth.getUser(); const email = data.user?.email;
      if (!email) return { ok: false, error: 'Please sign in again.' };
      const check = await db.auth.signInWithPassword({ email, password: current }); // confirm it's really them
      if (check.error) return { ok: false, error: check.error.status === 400 ? "That isn't your current password." : TROUBLE };
      const { error } = await db.auth.updateUser({ password: next });
      return error ? { ok: false, error: TROUBLE } : { ok: true, value: null };
    },
    async saveProfile(patch) {
      const run = settled().then(async () => {
        const id = await myId(); if (!id) return;
        const { error } = await db.from('profiles').update(toRow(patch)).eq('id', id); must(error);
      });
      saving = run; return run;
    },
    async members() {
      await settled(); // so the score uses the profile just saved
      const { data, error } = await db.rpc('find_members'); must(error);
      return (data || []).map((r: { username: string; is_peer: boolean; wants_peer: boolean; region: string; active: string; stage: string; looking: string[]; byline: string; tags: string[]; pct: number }): Member => ({
        username: r.username, isPeer: r.is_peer, wantsPeer: r.wants_peer, region: r.region, active: r.active, stage: r.stage,
        looking: r.looking, byline: r.byline, tags: r.tags, pct: r.pct,
      }));
    },
    async block(username) { const { error } = await db.rpc('block', { name: username }); must(error); },
    async blocked() { const { data, error } = await db.rpc('my_blocked'); must(error); return (data || []).map((r: { username: string }) => r.username); },
    async unblock(username) { const { error } = await db.rpc('unblock', { name: username }); must(error); },
    async signOut() { leaving = settled().then(() => db.auth.signOut()).catch(() => undefined); await leaving; },
    async deleteAccount() {
      const me = (await myProfile())?.username; const { error } = await db.rpc('delete_my_account'); must(error);
      if ((await this.passkeyAccount()) === me) await remember(null);
      await db.auth.signOut();
    },
  };
}
