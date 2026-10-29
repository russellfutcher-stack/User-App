import type { PathKey, Vis, VisKey } from '../data/reference';
import type { Member } from '../lib/match';
export type { Member } from '../lib/match';

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

// A chat message or room post. `who` names the poster in rooms.
export type Msg = { id: string; mine: boolean; text: string; at: number; who?: string };
export type ChatSummary = { with: string; last: Msg; unread: boolean };
export type Room = { id: string; cat: PathKey; name: string; desc: string; members: number; joined: boolean; mine: boolean };
export type RoomRequest = { id: string; name: string; cat: PathKey; status: 'Checking' | 'Approved' };
export type Undo = () => Promise<void>;
// Every message and post is checked for safety before anyone sees it.
// `help` means it was sent and the Help sheet should open; `blocked` holds why it wasn't sent.
// `ageCheck` means the account is now paused: 'ask' until they confirm they are 18 or older, 'review' while it is reviewed.
export type Sent = { ok: true; msg: Msg; help: boolean } | { ok: false; blocked?: string; error: string; ageCheck?: AgeCheck };
export type AgeCheck = 'ask' | 'review';
// What a member needs to see when they open the app: a check-in after a danger report, or the age check.
export type Notices = { checkin: boolean; ageCheck: AgeCheck | null };
export type Review = {
  id: string; topic: string; text: string; auto: boolean; due: string;
  status: string; // "Being reviewed", or "Decided: Upheld" and so on
  note?: string; by?: 'automatic' | 'arbitrator';
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Everything the app needs from a server. `local` keeps data in this browser
// (for the demo and the tests); `supabase` is the real server in Sydney.
export interface Backend {
  kind: 'local' | 'supabase';
  passkeysReady: boolean;
  usernameTaken(name: string): Promise<boolean>;
  signUp(username: string, password: string): Promise<Result<Profile>>; // also signs in
  signIn(username: string, password: string): Promise<Result<Profile>>;
  passkeyAccount(): Promise<string | null>; // username with a passkey on this device, if known
  signInWithPasskey(): Promise<Result<Profile>>;
  hasPasskey(): Promise<boolean>;
  setPasskey(on: boolean): Promise<Result<null>>; // adds or removes the signed-in member's passkey
  changePassword(current: string, next: string): Promise<Result<null>>;
  saveProfile(patch: Partial<Profile>): Promise<void>;
  members(): Promise<Member[]>; // everyone you can match with, scored against your profile
  block(username: string): Promise<void>;
  blocked(): Promise<string[]>;
  // Chats: newest first. Opening a chat marks it read. Sample members reply with their prototype lines.
  chats(): Promise<ChatSummary[]>;
  messages(withUser: string): Promise<Msg[]>;
  send(withUser: string, text: string): Promise<Sent>;
  sampleReply(withUser: string): Promise<Msg | null>;
  deleteChat(withUser: string): Promise<Undo>;
  onChange(fn: () => void): () => void; // called when a message or post arrives; returns a stop function
  // Rooms
  rooms(): Promise<Room[]>;
  roomPosts(id: string): Promise<Msg[]>;
  joinRoom(id: string): Promise<void>;
  post(id: string, text: string): Promise<Sent>;
  leaveRoom(id: string): Promise<Undo>; // or deletes it, for a room you created
  roomRequests(): Promise<RoomRequest[]>;
  requestRoom(name: string, cat: PathKey, desc: string): Promise<Result<Room>>;
  // Safety: reports are checked straight away; serious ones also raise an urgent review.
  report(username: string, reason: string): Promise<Result<{ urgent: boolean }>>;
  requestReview(topic: string, text: string): Promise<Result<Review>>;
  reviews(): Promise<Review[]>; // newest first
  notices(): Promise<Notices>;
  seenCheckin(): Promise<void>;
  confirmAge(): Promise<Result<null>>; // ticks 'I am 18 or older' and unpauses the account
  unblock(username: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

export const blankProfile = (username: string): Profile => ({
  username, byline: '', stage: 'na', looking: ['chat'], wantsPeer: null, isPeer: false, tags: [],
  vis: { interests: 'everyone', mh: 'matches', subs: 'matches' },
  prefs: { searchable: true, disappearing: false, lock: false }, setupDone: false,
});
