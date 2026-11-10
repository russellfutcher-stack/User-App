// The Me page, in the prototype's order: username and byline, Peer support, My profile,
// Edit profile, Privacy & visibility, Security, Sign out, Delete account, disclaimer.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../backend';
import { useApp } from '../state/app';
import { Btn, Card, Disclaimer, ErrorText, Field, H1, H2, H3, Label, Meter, P, Row, Select, Toggle, s as ui } from '../components/ui';
import { COUNTRIES } from '../data/places';
import { passHint, passStrength } from '../lib/account';
import { AboutFields, PeerCard, ThreeChoices, VisSelect } from './profileParts';
import { C, F } from '../theme';

function Byline() {
  const { profile, update, toast } = useApp();
  const [editing, setEditing] = useState(false); const [text, setText] = useState('');
  if (!profile) return null;
  return (
    <View style={{ gap: 4, paddingTop: 6, paddingHorizontal: 2 }} id="me-head">
      <H1>{profile.username}</H1>
      {editing ? <>
        <Field label="Your byline" id="by-in" maxLength={240} value={text} onChangeText={setText} autoFocus />
        <Row>
          <Btn sm variant="primary" label="Save byline" onPress={() => { update({ byline: text.trim() }); setEditing(false); toast('Byline saved.'); }} />
          <Btn sm label="Cancel" onPress={() => setEditing(false)} />
        </Row>
      </> : (
        <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text id="me-byline" style={[ui.p, { flex: 1, fontSize: 16 }, !profile.byline && { color: C.muted }]}>{profile.byline || 'No byline yet.'}</Text>
          <Btn sm label={profile.byline ? 'Change byline' : 'Add byline'} onPress={() => { setText(profile.byline); setEditing(true); }} />
        </Row>
      )}
    </View>
  );
}

// Change password: check the current one, then set a new one (same rules as sign-up).
function RecoveryEmail({ now, done }: { now: string; done: (e: string) => void }) {
  const { closeSheet, toast } = useApp();
  const [email, setEmail] = useState(now); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (e: string) => {
    setBusy(true); const r = await backend.setRecoveryEmail(e); setBusy(false);
    if (!r.ok) return setErr(r.error);
    done(e.trim().toLowerCase()); closeSheet(); toast(e ? 'Email saved for password resets.' : 'Email removed.');
  };
  return (
    <>
      <H2>Email for password resets</H2>
      <P>If you forget your password, we can email you a code to set a new one. This is optional.</P>
      <P small muted>It's only used for password reset codes. It's never shown to anyone, and nobody can find you by it.</P>
      <Field label="Email" id="rec-email" keyboardType="email-address" autoComplete="email" autoCapitalize="none" maxLength={254} value={email} onChangeText={setEmail} />
      <ErrorText id="rec-err" text={err} />
      <Row>
        <Btn variant="primary" label="Save email" disabled={busy || !email.trim()} onPress={() => save(email)} />
        {now ? <Btn label="Remove" disabled={busy} onPress={() => save('')} /> : <Btn label="Cancel" onPress={closeSheet} />}
      </Row>
    </>
  );
}

function ChangePassword() {
  const { closeSheet, toast } = useApp();
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [next2, setNext2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!cur) return setErr('Enter your current password.');
    if (next.length < 8) return setErr('Your new password needs at least 8 characters.');
    if (next !== next2) return setErr("The two new passwords don't match.");
    if (next === cur) return setErr('Choose a password different from your current one.');
    setBusy(true); const r = await backend.changePassword(cur, next); setBusy(false);
    if (!r.ok) return setErr(r.error);
    closeSheet(); toast('Password changed. Use your new password next time you sign in.');
  };
  return (
    <>
      <H2>Change password</H2>
      <Field label="Current password" id="pw-cur" secureTextEntry autoComplete="current-password" value={cur} onChangeText={setCur} />
      <Field label="New password" id="pw-new" secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" value={next} onChangeText={setNext}
        hint={<><Meter pct={passStrength(next)} /><P hint>{passHint(next)}</P></>} />
      <Field label="Confirm new password" id="pw-new2" secureTextEntry autoComplete="new-password" value={next2} onChangeText={setNext2} />
      <ErrorText id="pw-err" text={err} />
      <Row>
        <Btn variant="primary" label="Save new password" disabled={busy} onPress={save} />
        <Btn label="Cancel" onPress={closeSheet} />
      </Row>
    </>
  );
}

// Notifications are per device, so the switch asks the device, not the profile. Off until the member turns it on.
function Notifications() {
  const { toast } = useApp();
  const [on, setOn] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { backend.notificationsOn().then(setOn).catch(() => setOn(false)); }, []);
  const change = async (v: boolean) => {
    if (busy) return; setBusy(true); const r = await backend.setNotifications(v).catch(() => null); setBusy(false);
    if (!r?.ok) { toast(r?.error || "Couldn't change notifications. Check your connection and try again."); return; }
    setOn(v); toast(v ? 'Notifications are on for this device.' : 'Notifications are off for this device.');
  };
  return <Toggle id="t-notify" label="Notifications on this device" value={on} onChange={change}
    hint="A quiet alert for new messages and review decisions. It never shows names or what was said." />;
}

// Location (Rusty, 8 Nov 2026): city and country. Your country is shown to everyone; your city only to the people you choose,
// and only they can find you by city in Search.
function Location() {
  const { profile, update } = useApp();
  if (!profile) return null;
  return (
    <Card>
      <H2>Location</H2>
      <Field label="City" id="loc-city" maxLength={60} value={profile.city || ''} placeholder="For example Leeds" autoComplete="off"
        onChangeText={t => update({ city: t.replace(/\s+/g, ' ').trimStart() })} />
      <Select label="Country" id="loc-country" value={profile.homeCountry || ''}
        options={[{ id: '', label: 'Not set' }, ...COUNTRIES.map(c => ({ id: c, label: c }))]} onChange={c => update({ homeCountry: c })} />
      <VisSelect k="location" label="Who sees my city" />
      <P hint>Your country is shown to everyone. Your city is shown only to the people you choose here, and only they can find you by city in Search. Changes save as you type.</P>
    </Card>
  );
}

function Security() {
  const { toast, openSheet } = useApp();
  const [passkey, setPasskey] = useState(false); const [blocked, setBlocked] = useState<string[]>([]); const [email, setEmail] = useState('');
  useEffect(() => { backend.hasPasskey().then(setPasskey); backend.blocked().then(setBlocked).catch(() => setBlocked([])); backend.recoveryEmail().then(setEmail).catch(() => null); }, []);
  const setPk = async (on: boolean) => {
    if (on && !backend.passkeysReady) { toast("Passkeys aren't ready yet. They're coming soon."); return; }
    const r = await backend.setPasskey(on); if (!r.ok) { toast(r.error); return; }
    setPasskey(on);
    toast(on ? 'Passkey added. You can now sign in with your face, fingerprint or PIN.' : 'Passkey removed from this device.');
  };
  const unblock = async (u: string) => { await backend.unblock(u); setBlocked(b => b.filter(x => x !== u)); toast(`${u} is unblocked.`); };
  const Line = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <View style={ui.line}><View style={{ flex: 1 }}><Text style={ui.p}>{label}</Text>{sub ? <Text style={[ui.hint, { marginTop: 2 }]}>{sub}</Text> : null}</View>{children}</View>
  );
  return (
    <Card>
      <H3>Security</H3>
      <View style={{ gap: 8 }}>
        <Line label="Password"><Btn sm label="Change" onPress={() => openSheet(<ChangePassword />)} /></Line>
        <Line label="Email for password resets" sub={email ? `${email}. Only used for reset codes, never shown.` : 'Optional. Add one so you can reset a forgotten password.'}>
          <Btn sm label={email ? 'Change' : 'Add email'} onPress={() => openSheet(<RecoveryEmail now={email} done={setEmail} />)} />
        </Line>
        <Line label="Two-step verification"><Btn sm label="Set up" onPress={() => toast('Authenticator-app setup (TOTP) opens here.')} /></Line>
        <Line label="Passkey" sub={passkey ? 'Saved on this device. Sign in with your face, fingerprint or PIN.' : 'Not set up. Add one so you can sign in without your password.'}>
          {passkey ? <Btn sm label="Remove" onPress={() => setPk(false)} /> : <Btn sm label="Add a passkey" onPress={() => setPk(true)} />}
        </Line>
      </View>
      <View style={{ gap: 10 }} id="blocked">
        <Label>Blocked people ({blocked.length})</Label>
        {blocked.length
          ? <View style={{ gap: 8 }}>{blocked.map(u => <Line key={u} label={u}><Btn sm label="Unblock" onPress={() => unblock(u)} /></Line>)}</View>
          : <P hint>No one is blocked. You can block someone from their profile or from a chat.</P>}
      </View>
      <P hint>No email, phone number or real name is ever required. An email for password resets is optional.</P>
    </Card>
  );
}

export function Me() {
  const { profile, update, toast, signOut, openSheet, closeSheet, go } = useApp();
  if (!profile) return null;
  const pref = (k: keyof typeof profile.prefs) => (v: boolean) => { update({ prefs: { ...profile.prefs, [k]: v } }); toast(v ? 'Turned on.' : 'Turned off.'); };
  const confirmDelete = () => openSheet(<>
    <H2>Delete your account?</H2>
    <P>This permanently erases your profile, messages and check-ins. It can't be undone.</P>
    <Row>
      <Btn variant="danger" label="Delete everything" onPress={async () => {
        try { await backend.deleteAccount(); } catch { toast("Couldn't delete your account. Check your connection and try again."); return; }
        closeSheet(); signOut(); go('welcome');
        toast(backend.kind === 'local' ? 'Account deleted. The demo account has been restored for testing.' : 'Account deleted.');
      }} />
      <Btn label="Keep my account" onPress={closeSheet} />
    </Row>
  </>);
  return (
    <>
      <Byline />
      <PeerCard />
      <ThreeChoices heading={<Text role="heading" aria-level={2} style={{ fontFamily: F.displayBold, fontSize: 28, color: C.ink, letterSpacing: -0.5 }}>My profile</Text>}
        foot="Who can see these is set under Privacy & visibility below." />
      <Location />
      <Card><H2>Edit profile</H2><AboutFields withByline={false} /><P hint>Changes save as you type.</P></Card>
      <Card>
        <H3>Privacy & visibility</H3>
        <VisSelect k="interests" label="Who sees my interests" />
        <VisSelect k="mh" label="Who sees my mental health tags" />
        <VisSelect k="subs" label="Who sees my substance tags" />
        <View>
          <Toggle id="t-searchable" label="Show me in Search results" value={profile.prefs.searchable} onChange={pref('searchable')} />
          <Toggle id="t-disappearing" label="Disappearing messages (7 days)" value={profile.prefs.disappearing} onChange={pref('disappearing')}
            hint="Chat messages are deleted for both of you 7 days after they are sent, from the app and our servers. Room posts are not affected." />
          <Toggle id="t-lock" label="App lock with PIN or Face ID" value={profile.prefs.lock} onChange={pref('lock')} />
          <Notifications />
        </View>
      </Card>
      <Security />
      <Btn block label="Sign out" onPress={signOut} />
      <Btn block variant="danger" label="Delete account" onPress={confirmDelete} />
      <Disclaimer />
    </>
  );
}
