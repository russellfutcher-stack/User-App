// Sign-up in three steps: the community agreement, username and password, then a passkey.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { backend, Profile } from '../backend';
import { HANDLE_RE, genHandle, passHint, passStrength } from '../lib/account';
import { useApp } from '../state/app';
import { B, Bullet, Btn, Card, Check, ErrorText, Field, H2, Meter, P, Pill, Section, Steps, Toggle, s as ui } from '../components/ui';
import { C } from '../theme';

export const STEPS = ['rules', 'handle', 'passkey'] as const;

export function useSignUp() {
  const [i, setI] = useState(0);
  // `made` is the new account once it exists: a passkey can only be added to an account that exists.
  const blank = { age: false, agree: false, handle: '', pass: '', pass2: '', passkey: false, made: null as Profile | null };
  const [d, setD] = useState(blank);
  return {
    i, setI, d, set: (patch: Partial<typeof d>) => setD(x => ({ ...x, ...patch })),
    reset: () => { setI(0); setD(blank); }, // so a password never stays in memory after sign-up
  };
}

function SaltBox() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: C.surface2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 8 }}>
      <Pressable role="button" aria-expanded={open} onPress={() => setOpen(!open)}><Text style={[ui.p, ui.b, { color: C.accent }]}>What is a salted hash?</Text></Pressable>
      {open ? <View style={{ gap: 8 }} id="salt">
        <P small>User never keeps your actual password. When you create one, we add a random string of characters called a <B>salt</B>, then run the two together through a one-way formula called a <B>hash</B>. That turns them into a long scrambled code, which is all we store.</P>
        <P small>When you sign in, the same steps run again and the two codes are compared. A hash can't be turned back into your password, and because everyone's salt is different, two people with the same password get different codes. So even if someone stole the stored codes, they couldn't read anyone's password.</P>
      </View> : null}
    </View>
  );
}

export function SignUp({ flow }: { flow: ReturnType<typeof useSignUp> }) {
  const { signedIn, toast } = useApp();
  const { i, setI, d, set } = flow;
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const st = STEPS[i];

  const next = async () => {
    setErr('');
    if (st === 'rules' && !(d.age && d.agree)) return setErr('Please confirm you are 18+ and agree to the community agreement.');
    if (st === 'handle') {
      if (!HANDLE_RE.test(d.handle)) return setErr('Usernames need 3 to 20 letters, numbers or underscores, with no spaces.');
      setBusy(true);
      let taken = false;
      try { taken = await backend.usernameTaken(d.handle); } catch { setBusy(false); return setErr('Something went wrong reaching User. Check your connection and try again.'); }
      setBusy(false);
      if (taken) return setErr('That username is taken. Try another, or tap Suggest.');
      if (d.pass.length < 8) return setErr('Your password needs at least 8 characters.');
      if (d.pass !== d.pass2) return setErr("The two passwords don't match.");
    }
    if (st === 'passkey') {
      if (busy) return;
      let made = d.made;
      if (!made) { setBusy(true); const r = await backend.signUp(d.handle, d.pass); setBusy(false); if (!r.ok) return setErr(r.error); made = r.value; }
      signedIn(made); toast('Account created. Now set up your profile.'); return;
    }
    setI(i + 1);
  };

  const makePasskey = async () => {
    if (!backend.passkeysReady) { toast("Passkeys aren't ready yet. You can add one later on the Me page."); return; }
    if (busy) return; setErr(''); setBusy(true);
    let made = d.made;
    if (!made) {
      const r = await backend.signUp(d.handle, d.pass);
      if (!r.ok) { setBusy(false); return setErr(r.error); }
      made = r.value; set({ made });
    }
    const pk = await backend.setPasskey(true); setBusy(false);
    if (!pk.ok) return setErr(pk.error);
    set({ passkey: true }); toast('Passkey saved on this device.');
  };

  return (
    <>
      <Steps n={i + 1} of={STEPS.length} />
      {st === 'rules' && <>
        <H2>Before you start</H2>
        <Card>
          <Check id="r-age" label="I am 18 or older" value={d.age} onChange={v => set({ age: v })} />
          <Section>
            <P small bold>Our community agreement</P>
            <View style={{ gap: 6 }} id="rules">
              <Bullet>Be kind. Everyone here is at a different stage, and all of them are welcome.</Bullet>
              <Bullet>No buying, selling, sharing or sourcing drugs. No dosing advice.</Bullet>
              <Bullet>Stay anonymous. Don't share real names, addresses or socials, and think carefully before sharing a phone number.</Bullet>
              <Bullet>We're peer support, not a crisis service. Help now is always at the top.</Bullet>
            </View>
          </Section>
          <SaltBox />
          <Toggle id="r-agree" label="I agree to the community agreement" value={d.agree} onChange={v => set({ agree: v })} />
        </Card>
      </>}
      {st === 'handle' && <>
        <H2>Choose a username and password</H2>
        <P muted>Pick any username you like, or use a suggested one. Don't use your real name, so nothing links back to you.</P>
        <Field label="Username" id="ob-h" autoComplete="username" autoCapitalize="none" maxLength={20} value={d.handle}
          onChangeText={v => set({ handle: v.trim() })} hint="3 to 20 letters, numbers or underscores."
          right={<Btn sm label="Suggest" onPress={() => set({ handle: genHandle() })} />} />
        <Field label="Password" id="ob-p" secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" value={d.pass}
          onChangeText={v => set({ pass: v })} hint={<><Meter pct={passStrength(d.pass)} /><P hint id="ph">{passHint(d.pass)}</P></>} />
        <Field label="Confirm password" id="ob-p2" secureTextEntry autoComplete="new-password" value={d.pass2} onChangeText={v => set({ pass2: v })} />
      </>}
      {st === 'passkey' && <>
        <H2>Protect your account with a passkey</H2>
        <P muted>A passkey lets you sign in with your face, fingerprint or phone PIN. There's nothing to write down or keep safe.</P>
        <Card tone="calm">
          <View style={{ gap: 4 }}>
            <Bullet>It's stored by your phone or computer, never by User.</Bullet>
            <Bullet>Most devices back it up to your Apple, Google or Microsoft account, so it isn't lost if you change phones.</Bullet>
            <Bullet>It can't be guessed or phished, and it needs no email or phone number.</Bullet>
          </View>
        </Card>
        {d.passkey
          ? <View role="status" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Pill peer text="Passkey saved" /><P small>You can sign in with it next time.</P></View>
          : <Btn label="Create a passkey" onPress={makePasskey} />}
        {d.passkey ? null : <P hint>You can skip this and add one later on the Me page. Without a passkey, your password is the only way in.</P>}
      </>}
      <ErrorText id="ob-err" text={err} />
      <Btn variant="primary" block disabled={busy} onPress={next}
        label={st === 'passkey' ? (d.passkey ? 'Create account' : 'Create account without a passkey') : 'Continue'} />
    </>
  );
}
