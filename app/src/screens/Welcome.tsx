import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../backend';
import { useApp } from '../state/app';
import { B, Btn, Card, ErrorText, Field, H2, P, s as ui } from '../components/ui';
import { C, F } from '../theme';

const BENEFITS: [string, string][] = [
  ['Find people who get it.', 'We match you on shared interests, drug use and mental health, so conversations start from common ground.'],
  ['Stay anonymous.', 'No real name, email or phone number. You decide who sees what.'],
  ['Feel less alone, day or night.', 'One-to-one chats, small group rooms, and peer supporters who have been there too.'],
  ['Safe by design.', 'Every message is checked for safety, drug dealing is blocked, and Help now is one tap away.']];
const HOWTO = [
  'Create an anonymous account with a username and password.',
  "Set up your profile using the three choices: Interest, Drug use and Mental health, and say if you'd like peer support.",
  'See your matches on the Search page and say hi.',
  'Join rooms on topics that matter to you.',
  "To become a peer supporter, open the Me page and turn on 'Nominate myself as a peer supporter' under Peer support."];

export function AboutUser() {
  return (
    <>
      <Card>
        <H2>Why people use User</H2>
        <View style={{ gap: 10 }} role="list" id="benefits">
          {BENEFITS.map(([b, t]) => (
            <View key={b} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.drug, marginTop: 2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontFamily: F.bold }}>✓</Text></View>
              <Text style={[ui.p, { flex: 1 }]}><B>{b}</B> {t}</Text>
            </View>))}
        </View>
      </Card>
      <Card>
        <H2>How to use it</H2>
        <View style={{ gap: 8 }} role="list" id="howto">
          {HOWTO.map((t, i) => (
            <View key={i} role="listitem" style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontFamily: F.display, color: C.accent, fontSize: 15, lineHeight: 22 }}>{i + 1}.</Text>
              <Text style={[ui.p, { flex: 1 }]}>{t}</Text>
            </View>))}
        </View>
      </Card>
    </>
  );
}

export function Welcome() {
  const { go, signedIn, openSheet, closeSheet, toast } = useApp();
  const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (busy) return; setBusy(true);
    const r = await backend.signIn(user, pass); setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    signedIn(r.value);
  };
  const passkey = async () => {
    const name = await backend.passkeyAccount();
    if (!name) { setErr('No passkey for User is saved on this device. Sign in with your username and password.'); return; }
    openSheet(<>
      <H2>Sign in with a passkey</H2>
      <P>Your device will ask for your face, fingerprint or PIN.</P>
      {backend.kind === 'local' ? <P hint>In this demo the device check is simulated.</P> : null}
      <Btn variant="primary" label={`Continue as ${name}`} onPress={async () => {
        closeSheet(); const r = await backend.signInWithPasskey();
        if (!r.ok) { setErr(r.error); return; }
        signedIn(r.value); toast('Signed in with your passkey.');
      }} />
    </>);
  };
  const forgot = () => openSheet(<>
    <H2>Forgot your password?</H2>
    <P>If you set up a passkey, sign in with it, then change your password on the Me page.</P>
    <Btn variant="primary" label="Sign in with a passkey" onPress={() => { closeSheet(); passkey(); }} />
    <P small muted>User keeps no email or phone number, so without a passkey we can't reset your password. You can create a new anonymous account instead.</P>
  </>);

  return (
    <>
      <View style={{ gap: 10, paddingTop: 6 }}>
        <Text role="heading" aria-level={1} style={{ fontFamily: F.display, fontSize: 60, lineHeight: 58, letterSpacing: -1.8, color: C.ink }}>User</Text>
        <Text style={{ fontFamily: F.displayMed, fontSize: 20, color: C.accentStrong }}>Connection and Recovery</Text>
        <P style={{ fontSize: 16 }}>A private, anonymous place to meet people who understand what you're going through, whether you use drugs, are in recovery, or live with a mental health condition.</P>
      </View>
      <AboutUser />
      <Card>
        <H2>Sign in</H2>
        <Field label="Username" id="li-h" autoComplete="username" autoCapitalize="none" placeholder="Your username" value={user} onChangeText={setUser} onSubmitEditing={signIn} />
        <Field label="Password" id="li-p" secureTextEntry autoComplete="current-password" placeholder="Your password" value={pass} onChangeText={setPass} onSubmitEditing={signIn} />
        <ErrorText id="li-err" text={err} />
        <Btn variant="primary" block label="Sign in" onPress={signIn} id="li-go" />
        <Btn block label="Sign in with a passkey" onPress={passkey} />
        <Btn variant="quiet" sm label="Forgot password?" onPress={forgot} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.lineSoft }} /><Text style={[ui.hint, { fontSize: 13 }]}>New here?</Text><View style={{ flex: 1, height: 1, backgroundColor: C.lineSoft }} />
        </View>
        <Btn block label="Create an anonymous account" onPress={() => go('signup')} />
        <P hint>No email or phone needed. 18+ only.{backend.kind === 'local' ? <> Demo account: <B>QuietHeron</B> / <B>quiet heron walks</B></> : null}</P>
      </Card>
    </>
  );
}
