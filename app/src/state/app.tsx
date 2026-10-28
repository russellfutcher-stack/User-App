// App-wide state: who is signed in, which page is open, and the shared sheet and toast.
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { backend, Profile } from '../backend';
import { blankQuery, Query } from '../lib/match';

export type Tab = 'home' | 'me' | 'find' | 'chat' | 'rooms' | 'support';
export type Page = 'welcome' | 'signup' | 'main';

type Ctx = {
  profile: Profile | null; page: Page; tab: Tab; quickExit: boolean;
  sheet: ReactNode | null; toastMsg: { text: string; n: number } | null;
  go: (p: Page) => void; setTab: (t: Tab) => void;
  signedIn: (p: Profile) => void; signOut: () => void;
  update: (patch: Partial<Profile>) => void;
  toast: (text: string) => void; openSheet: (n: ReactNode) => void; closeSheet: () => void;
  exit: () => void; unexit: () => void;
  // Search: the choices being made (`query`), the last search run (`applied`), and whether all matches show.
  query: Query; setQuery: (q: Query) => void; applied: Query; setApplied: (q: Query) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
  matches: boolean; setMatches: (v: boolean) => void; // the matches screen after profile setup
  membersVer: number; membersChanged: () => void; // bumped after a block, so lists reload
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('useApp outside AppProvider'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>('welcome');
  const [tab, setTabState] = useState<Tab>('home');
  const [quickExit, setQuickExit] = useState(false);
  const [sheet, setSheet] = useState<ReactNode | null>(null);
  const [toastMsg, setToast] = useState<{ text: string; n: number } | null>(null);
  const [query, setQuery] = useState<Query>(blankQuery); const [applied, setApplied] = useState<Query>(blankQuery);
  const [showAll, setShowAll] = useState(false); const [matches, setMatches] = useState(false); const [membersVer, setVer] = useState(0);
  const taps = useRef(0); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string) => {
    setToast(t => ({ text, n: (t?.n || 0) + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);
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
    setTab: t => setTabState(t),
    signedIn: p => { setProfile(p); setTabState('home'); setPage('main'); },
    signOut: () => {
      backend.signOut(); setProfile(null); setSheet(null); setPage('welcome');
      setQuery(blankQuery()); setApplied(blankQuery()); setShowAll(false); setMatches(false);
    },
    update: patch => {
      setProfile(p => (p ? { ...p, ...patch } : p));
      backend.saveProfile(patch).catch(() => toast("Couldn't save. Check your connection and try again."));
    },
    exit: () => { setSheet(null); taps.current = 0; setQuickExit(true); },
    unexit: () => { taps.current += 1; if (taps.current >= 3) setQuickExit(false); },
    query, setQuery, applied, setApplied, showAll, setShowAll, matches, setMatches,
    membersVer, membersChanged: () => setVer(v => v + 1),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
