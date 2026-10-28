// The real server: Supabase in the Sydney region.
import { createClient } from '@supabase/supabase-js';
import { SAMPLE_HANDLES } from '../data/reference';
import { Backend, Profile } from './types';

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

const WRONG = "That username and password don't match. Check for typos, or use a recovery code.";
const TROUBLE = "Something went wrong reaching User. Check your connection and try again.";

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

  return {
    kind: 'supabase',
    passkeysReady: false, // real passkeys (WebAuthn) are added later in step 1
    async usernameTaken(name) {
      if (SAMPLE_HANDLES.some(h => h.toLowerCase() === name.toLowerCase())) return true;
      const { data, error } = await db.rpc('username_taken', { name }); must(error); return !!data;
    },
    async signUp(username, password) {
      const { data, error } = await db.auth.signUp({ email: emailFor(username), password, options: { data: { username } } });
      if (error) return { ok: false, error: /registered|exists/i.test(error.message) ? 'That username is taken. Try another, or tap Suggest.' : TROUBLE };
      if (!data.session) return { ok: false, error: TROUBLE }; // "Confirm email" is still on in Supabase
      const p = await myProfile(); return p ? { ok: true, value: p } : { ok: false, error: TROUBLE };
    },
    async signIn(username, password) {
      const { error } = await db.auth.signInWithPassword({ email: emailFor(username), password });
      if (error) return { ok: false, error: error.status === 400 ? WRONG : TROUBLE };
      const p = await myProfile(); return p ? { ok: true, value: p } : { ok: false, error: TROUBLE };
    },
    async passkeyAccount() { return null; },
    async signInWithPasskey() { return { ok: false, error: 'No passkey for User is saved on this device. Sign in with your username and password.' }; },
    async hasPasskey() { return false; },
    async setPasskey() { /* added with WebAuthn later in step 1 */ },
    async saveProfile(patch) {
      const id = await myId(); if (!id) return;
      const { error } = await db.from('profiles').update(toRow(patch)).eq('id', id); must(error);
    },
    async blocked() { const { data, error } = await db.rpc('my_blocked'); must(error); return (data || []).map((r: { username: string }) => r.username); },
    async unblock(username) { const { error } = await db.rpc('unblock', { name: username }); must(error); },
    async signOut() { await db.auth.signOut(); },
    async deleteAccount() { const { error } = await db.rpc('delete_my_account'); must(error); await db.auth.signOut(); },
  };
}
