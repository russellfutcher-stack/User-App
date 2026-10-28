import type { Vis, VisKey } from '../data/reference';

export type Profile = {
  username: string;
  byline: string;
  stage: string;
  looking: string[];
  wantsPeer: boolean | null; // null until answered at setup
  isPeer: boolean;
  tags: string[];
  vis: Record<VisKey, Vis>;
  prefs: { searchable: boolean; disappearing: boolean; lock: boolean };
  setupDone: boolean;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Everything the app needs from a server. `local` keeps data in this browser
// (for the demo and the tests); `supabase` is the real server in Sydney.
export interface Backend {
  kind: 'local' | 'supabase';
  passkeysReady: boolean;
  usernameTaken(name: string): Promise<boolean>;
  signUp(username: string, password: string, passkey: boolean): Promise<Result<Profile>>;
  signIn(username: string, password: string): Promise<Result<Profile>>;
  passkeyAccount(): Promise<string | null>; // username with a passkey on this device
  signInWithPasskey(): Promise<Result<Profile>>;
  hasPasskey(): Promise<boolean>;
  setPasskey(on: boolean): Promise<void>;
  changePassword(current: string, next: string): Promise<Result<null>>;
  saveProfile(patch: Partial<Profile>): Promise<void>;
  blocked(): Promise<string[]>;
  unblock(username: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

export const blankProfile = (username: string): Profile => ({
  username, byline: '', stage: 'na', looking: ['chat'], wantsPeer: null, isPeer: false, tags: [],
  vis: { interests: 'everyone', mh: 'matches', subs: 'matches' },
  prefs: { searchable: true, disappearing: false, lock: false }, setupDone: false,
});
