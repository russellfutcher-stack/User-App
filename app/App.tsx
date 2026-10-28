import React, { useEffect } from 'react';
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
import { QuickExit } from './src/screens/QuickExit';
import { C } from './src/theme';

function Screen() {
  const { page, profile, tab, quickExit, go } = useApp();
  const signup = useSignUp();
  const { reset } = signup;
  useEffect(() => { if (page !== 'signup' || profile) reset(); }, [page, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  if (quickExit) return <QuickExit />;

  let bar = <Bar />; let body: React.ReactNode; let tabs = false;
  if (page === 'signup' && !profile) {
    bar = <Bar title="Create account" back={() => (signup.i === 0 ? go('welcome') : signup.setI(signup.i - 1))} />;
    body = <SignUp flow={signup} />;
  } else if (!profile) {
    body = <Welcome />;
  } else if (!profile.setupDone) {
    bar = <Bar title="Set up your profile" />;
    body = <Setup />;
  } else {
    tabs = true;
    body = { home: <Home />, me: <Me />, find: <Later name="Search" />, chat: <Later name="Chats" />, rooms: <Later name="Rooms" />, support: <Later name="Support" /> }[tab];
  }
  const key = `${page}-${profile ? (profile.setupDone ? tab : 'setup') : signup.i}`; // a new page starts at the top
  return (
    <>
      {bar}
      <ScrollView key={key} id="screen" style={{ flex: 1 }} contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">{body}</ScrollView>
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
