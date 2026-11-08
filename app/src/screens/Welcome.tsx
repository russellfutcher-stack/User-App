import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../backend';
import { useApp } from '../state/app';
import { B, Btn, Card, ErrorText, Field, H2, P, Row, s as ui } from '../components/ui';
import { Profile } from '../backend/types';
import { C, F } from '../theme';

const BENEFITS: [string, string][] = [
  ['Find people who get it.', 'We match you on shared interests, drug use and mental health, so conversations start from common ground.'],
  ['Stay anonymous.', 'No real name, email or phone number. You decide who sees what.'],
  ['Feel less alone, day or night.', 'One-to-one chats, small group rooms, and peer supporters who have been there too.'],
  ['Safe by design.', 'Every message is checked for safety, drug dealing is blocked, and Help is one tap away.']];
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
    const viaPasskey = async () => {
      const r = await backend.signInWithPasskey();
      if (!r.ok) { setErr(r.error); return; }
      signedIn(r.value); toast('Signed in with your passkey.');
    };
    // On the real server a passkey synced from another device can still be used, so the device is asked.
    if (!name && backend.kind === 'supabase' && backend.passkeysReady) { setErr(''); viaPasskey(); return; }
    if (!name) { setErr('No passkey for User is saved on this device. Sign in with your username and password.'); return; }
    openSheet(<>
      <H2>Sign in with a passkey</H2>
      <P>Your device will ask for your face, fingerprint or PIN.</P>
      {backend.kind === 'local' ? <P hint>In this demo the device check is simulated.</P> : null}
      <Btn variant="primary" label={`Continue as ${name}`} onPress={() => { closeSheet(); viaPasskey(); }} />
    </>);
  };
  const forgot = () => openSheet(<ForgotPassword passkey={() => { closeSheet(); passkey(); }} done={signedIn} />);

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

// Forgot password (Rusty, 8 Nov 2026): a code is emailed to the address saved on the Me page, if there is one.
function ForgotPassword({ passkey, done }: { passkey: () => void; done: (p: Profile) => void }) {
  const { closeSheet, toast } = useApp();
  const [step, setStep] = useState<'ask' | 'code'>('ask');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [demo, setDemo] = useState('');
  const [code, setCode] = useState(''); const [pass, setPass] = useState(''); const [pass2, setPass2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!name.trim()) return setErr('Enter your username.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Enter the email address you saved on the Me page.');
    setBusy(true); const r = await backend.requestReset(name, email); setBusy(false);
    if (!r.ok) return setErr(r.error);
    setErr(''); setDemo(r.value.demo || ''); setStep('code');
  };
  const reset = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setErr('Enter the 6-digit code from the email.');
    if (pass.length < 8) return setErr('Your new password needs at least 8 characters.');
    if (pass !== pass2) return setErr("The two passwords don't match.");
    setBusy(true); const r = await backend.resetPassword(name, code, pass);
    if (!r.ok) { setBusy(false); return setErr(r.error); }
    const s = await backend.signIn(name, pass); setBusy(false);
    closeSheet(); toast('Password changed. You are signed in.');
    if (s.ok) done(s.value);
  };
  return step === 'ask' ? (
    <>
      <H2>Forgot your password?</H2>
      <P>If you saved an email for password resets on the Me page, we'll email you a code.</P>
      <Field label="Username" id="fp-name" autoComplete="username" autoCapitalize="none" value={name} onChangeText={setName} />
      <Field label="Email" id="fp-email" keyboardType="email-address" autoComplete="email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <ErrorText id="fp-err" text={err} />
      <Btn variant="primary" label="Email me a code" disabled={busy} onPress={send} />
      <P small muted>No email saved? Sign in with a passkey if you set one up, then change your password on the Me page.</P>
      <Btn label="Sign in with a passkey" onPress={passkey} />
    </>
  ) : (
    <>
      <H2>Check your email</H2>
      <P>If that username and email match, a 6-digit code is on its way. It lasts 15 minutes. Check your junk folder too.</P>
      {demo ? <P hint>Demo only: no email is sent. The code is {demo}.</P> : null}
      <Field label="Code" id="fp-code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} value={code} onChangeText={setCode} />
      <Field label="New password" id="fp-pass" secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" value={pass} onChangeText={setPass} />
      <Field label="Confirm new password" id="fp-pass2" secureTextEntry autoComplete="new-password" value={pass2} onChangeText={setPass2} />
      <ErrorText id="fp-err" text={err} />
      <Row>
        <Btn variant="primary" label="Set new password" disabled={busy} onPress={reset} />
        <Btn label="Send a new code" disabled={busy} onPress={() => { setStep('ask'); setCode(''); setErr(''); }} />
      </Row>
    </>
  );
}
