import React, { useState } from 'react';
import { backend } from '../backend';
import { useApp } from '../state/app';
import { Btn, Card, Check, ErrorText, H2, P } from '../components/ui';

// The age check (AI-agents-spec.md, section 3.6). A sign of being under 18 pauses the account until the member
// ticks "I am 18 or older"; after that, another sign pauses it while it is reviewed (Rusty, 29 Oct 2026).
export function AgeCheck() {
  const { paused, setPaused, signOut, toast } = useApp();
  const [age, setAge] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (paused === 'review') return (
    <Card>
      <H2>Your account is paused</H2>
      <P>Your account is paused while it is reviewed. Help now is still at the top if you need it.</P>
      <Btn block variant="quiet" label="Sign out" onPress={signOut} />
    </Card>
  );
  const confirm = async () => {
    if (!age) return setErr('Please tick the box to confirm you are 18 or older.');
    setBusy(true); const r = await backend.confirmAge().catch(() => null); setBusy(false);
    if (!r?.ok) return setErr(r?.error || 'Something went wrong reaching User. Check your connection and try again.');
    setPaused(null); toast('Thanks. Your account is open again.');
  };
  return (
    <Card>
      <H2>Please confirm your age</H2>
      <P>Your account is paused. User is for adults, so please confirm you are 18 or older to carry on.</P>
      <Check id="age-ok" label="I am 18 or older" value={age} onChange={v => { setAge(v); setErr(''); }} />
      {err ? <ErrorText id="age-err" text={err} /> : null}
      <Btn block label="Confirm and continue" onPress={confirm} disabled={busy} />
      <P hint>If you don't confirm within 7 days, the account and everything in it is removed.</P>
      <Btn block variant="quiet" label="Sign out" onPress={signOut} />
    </Card>
  );
}
