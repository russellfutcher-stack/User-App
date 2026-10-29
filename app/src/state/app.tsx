// App-wide state: who is signed in, which page is open, and the shared sheet and toast.
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { backend, Profile } from '../backend';
import type { AgeCheck } from '../backend/types';
import { blankQuery, Query } from '../lib/match';
import type { PathKey } from '../data/reference';

export type Tab = 'home' | 'me' | 'find' | 'chat' | 'rooms' | 'support';
export type Page = 'welcome' | 'signup' | 'main';
export type View = { name: 'chat'; with: string } | { name: 'room'; id: string; title: string } | null; // a chat or room, opened over the tabs

type Ctx = {
  profile: Profile | null; page: Page; tab: Tab; quickExit: boolean;
  sheet: ReactNode | null; toastMsg: { text: string; n: number; undo?: () => void } | null;
  go: (p: Page) => void; setTab: (t: Tab) => void;
  signedIn: (p: Profile) => void; signOut: () => void;
  update: (patch: Partial<Profile>) => void;
  toast: (text: string, undo?: () => void) => void; // with undo, the toast offers Undo for 5 seconds
  openSheet: (n: ReactNode) => void; closeSheet: () => void;
  exit: () => void; unexit: () => void;
  // Search: the choices being made (`query`), the last search run (`applied`), and whether all matches show.
  query: Query; setQuery: (q: Query) => void; applied: Query; setApplied: (q: Query) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
  matches: boolean; setMatches: (v: boolean) => void; // the matches screen after profile setup
  membersVer: number; membersChanged: () => void; // bumped after a block, so lists reload
  view: View; setView: (v: View) => void;
  roomCat: PathKey; setRoomCat: (k: PathKey) => void; // the type of room shown on Rooms, remembered
  chatsVer: number; unread: boolean; // chatsVer is bumped when a message or post arrives, or a chat changes
  chatsChanged: () => void; refreshUnread: () => void; // refreshUnread only rechecks the dot
  paused: AgeCheck | null; setPaused: (p: AgeCheck | null) => void; // the age check: the account is paused until it's done
  checkin: boolean; checkinShown: () => void; // a check-in after a danger report, shown once on the Help sheet
  arbitrator: boolean; // signed in as the arbitrator: the dashboard replaces the member pages
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('useApp outside AppProvider'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>('welcome');
  const [tab, setTabState] = useState<Tab>('home');
  const [quickExit, setQuickExit] = useState(false);
  const [sheet, setSheet] = useState<ReactNode | null>(null);
  const [toastMsg, setToast] = useState<{ text: string; n: number; undo?: () => void } | null>(null);
  const [view, setView] = useState<View>(null); const [roomCat, setRoomCat] = useState<PathKey>('interests');
  const [chatsVer, setChatsVer] = useState(0); const [unread, setUnread] = useState(false);
  const [paused, setPaused] = useState<AgeCheck | null>(null); const [checkin, setCheckin] = useState(false); const [arbitrator, setArbitrator] = useState(false);
  const chatsChanged = useCallback(() => setChatsVer(v => v + 1), []);
  const [query, setQuery] = useState<Query>(blankQuery); const [applied, setApplied] = useState<Query>(blankQuery);
  const [showAll, setShowAll] = useState(false); const [matches, setMatches] = useState(false); const [membersVer, setVer] = useState(0);
  const taps = useRef(0); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    if (!text) { setToast(null); return; } // an empty toast just hides the current one
    setToast(t => ({ text, n: (t?.n || 0) + 1, undo }));
    timer.current = setTimeout(() => setToast(null), undo ? 5000 : 2400);
  }, []);
  // While signed in, listen for new messages and posts, and keep the unread dot up to date.
  const signedInNow = !!profile;
  useEffect(() => { if (!signedInNow) return; return backend.onChange(chatsChanged); }, [signedInNow, chatsChanged]);
  const refreshUnread = useCallback(() => { backend.chats().then(l => setUnread(l.some(c => c.unread))).catch(() => undefined); }, []);
  useEffect(() => { if (!signedInNow) setUnread(false); else refreshUnread(); }, [signedInNow, chatsVer, view, refreshUnread]);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => { // Escape closes sheets on the web
    if (Platform.OS !== 'web') return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);

  const value: Ctx = {
    profile, page, tab, quickExit, sheet, toastMsg, toast, closeSheet,
    openSheet: n => setSheet(n),
    go: p => { setSheet(null); setPage(p); },
    setTab: t => { setView(null); setTabState(t); },
    signedIn: async p => {
      // The arbitrator is checked first, so a member page never shows before the dashboard.
      const arb = await backend.isArbitrator().catch(() => false);
      setArbitrator(arb); setProfile(p); setTabState('home'); setPage('main');
      if (!arb) backend.notices().then(n => { setPaused(n.ageCheck); setCheckin(n.checkin); }).catch(() => undefined);
    },
    signOut: () => {
      backend.signOut(); setProfile(null); setSheet(null); setPage('welcome'); setPaused(null); setCheckin(false); setArbitrator(false);
      setQuery(blankQuery()); setApplied(blankQuery()); setShowAll(false); setMatches(false); setView(null); setRoomCat('interests');
    },
    update: patch => {
      setProfile(p => (p ? { ...p, ...patch } : p));
      backend.saveProfile(patch).catch(() => toast("Couldn't save. Check your connection and try again."));
    },
    exit: () => { setSheet(null); taps.current = 0; setQuickExit(true); },
    unexit: () => { taps.current += 1; if (taps.current >= 3) setQuickExit(false); },
    query, setQuery, applied, setApplied, showAll, setShowAll, matches, setMatches,
    membersVer, membersChanged: () => { setVer(v => v + 1); chatsChanged(); },
    view, setView: v => { setSheet(null); setView(v); }, roomCat, setRoomCat, chatsVer, unread, chatsChanged, refreshUnread,
    paused, setPaused: p => { setSheet(null); setView(null); setPaused(p); },
    arbitrator, checkin, checkinShown: () => { setCheckin(false); backend.seenCheckin().catch(() => undefined); },
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
