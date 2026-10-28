import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { AppProvider, useApp } from './src/state/app';
import { Bar, SheetHost, Tabs, ToastHost } from './src/components/shell';
import { gradient } from './src/components/ui';
import { Welcome } from './src/screens/Welcome';
import { SignUp, useSignUp } from './src/screens/SignUp';
import { Setup } from './src/screens/Setup';
import { Me } from './src/screens/Me';
import { Home, Later } from './src/screens/Home';
import { Chat, Chats } from './src/screens/Chats';
import { Rooms, RoomScreen } from './src/screens/Rooms';
import { Search } from './src/screens/Search';
import { Matches } from './src/screens/Matches';
import { QuickExit } from './src/screens/QuickExit';
import { C } from './src/theme';

function Screen() {
  const { page, profile, tab, quickExit, go, matches, view, setView } = useApp();
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const toTop = () => scroller.current?.scrollTo({ y: 0, animated: false });
  const signup = useSignUp();
  const { reset } = signup;
  useEffect(() => { if (page !== 'signup' || profile) reset(); }, [page, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  if (quickExit) return <QuickExit />;

  let bar = <Bar />; let body: React.ReactNode; let tabs = false; let full: React.ReactNode = null; // `full` fills the screen itself
  if (page === 'signup' && !profile) {
    // Once a passkey has been added the account exists, so there is no going back to change the username.
    bar = <Bar title="Create account" back={signup.d.made ? undefined : () => (signup.i === 0 ? go('welcome') : signup.setI(signup.i - 1))} />;
    body = <SignUp flow={signup} />;
  } else if (!profile) {
    body = <Welcome />;
  } else if (!profile.setupDone) {
    bar = <Bar title="Set up your profile" />;
    body = <Setup />;
  } else if (view) {
    bar = <Bar title={view.name === 'chat' ? view.with : view.title} back={() => setView(null)} />;
    full = view.name === 'chat' ? <Chat key={view.with} withUser={view.with} /> : <RoomScreen key={view.id} id={view.id} />;
  } else if (matches) {
    bar = <Bar title="Your matches" />;
    body = <Matches />;
  } else {
    tabs = true;
    body = { home: <Home />, me: <Me />, find: <Search toTop={toTop} />, chat: <Chats />, rooms: <Rooms />, support: <Later name="Support" /> }[tab];
  }
  const key = `${page}-${profile ? (profile.setupDone ? (matches ? 'matches' : tab) : 'setup') : signup.i}`; // a new page starts at the top
  return (
    <>
      {bar}
      {full || <ScrollView ref={scroller} key={key} id="screen" style={{ flex: 1 }} contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">{body}</ScrollView>}
      {tabs ? <Tabs /> : null}
      <SheetHost />
      <ToastHost />
    </>
  );
}

// Wide screens show the app in a phone-sized frame; phones fill the screen.
function Frame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width > 820;
  return (
    <View style={[s.page, wide && { padding: 16 }]}>
      <View style={[s.device, wide ? [s.deviceWide, { height: Math.min(860, height - 32) }] : { flex: 1 }]} id="device">{children}</View>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider><Frame><Screen /></Frame></AppProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, ...gradient('linear-gradient(160deg,#A9CFEE,#D7E9F8 60%)') },
  device: { width: '100%', backgroundColor: C.surface2, overflow: 'hidden' },
  deviceWide: { width: 400, borderRadius: 32, borderWidth: 1, borderColor: C.lineSoft, boxShadow: '0 24px 60px rgba(10,30,61,.18)' },
  screen: { padding: 16, gap: 16 },
});
