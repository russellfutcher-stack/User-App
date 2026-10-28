// First sign-in: set up your profile in 4 numbered sections.
import React, { useState } from 'react';
import { View } from 'react-native';
import { TAG_CAT } from '../data/reference';
import { useApp } from '../state/app';
import { Btn, Card, ErrorText, H2, H3, P, Radio, Section } from '../components/ui';
import { AboutFields, ThreeChoices, VisSelect } from './profileParts';

export function Setup() {
  const { profile, update, toast, setTab, setMatches } = useApp();
  const [err, setErr] = useState('');
  if (!profile) return null;
  const save = () => {
    if (typeof profile.wantsPeer !== 'boolean') return setErr('Please answer whether you would like peer support.');
    if (!profile.tags.some(t => TAG_CAT[t] === 'interests')) return setErr('Pick at least one interest so we can find people for you.');
    update({ setupDone: true }); setTab('home'); setMatches(true); toast('Profile saved. Here are your matches.');
  };
  return (
    <>
      <Section>
        <H2>Welcome, {profile.username}. Let's set up your profile.</H2>
        <P muted>This is what other people see. Fill in only what you're comfortable sharing. You can change any of it later on the Me page.</P>
      </Section>
      <Card><H3>1. About you</H3><AboutFields withByline /></Card>
      <Card>
        <H3>2. Peer support</H3>
        <View role="radiogroup" aria-label="Would you like peer support?" style={{ gap: 8 }}>
          <P bold>Would you like peer support?</P>
          <P small muted>A peer supporter is a member who has been through similar things and offers to listen.</P>
          <Radio name="su-peer" value="yes" label="Yes, match me with peer supporters" on={profile.wantsPeer === true} onPress={() => update({ wantsPeer: true })} />
          <Radio name="su-peer" value="no" label="Not right now" on={profile.wantsPeer === false} onPress={() => update({ wantsPeer: false })} />
        </View>
      </Card>
      <ThreeChoices heading={<H3>3. Your three choices</H3>} foot="Pick at least one interest. Drug use and mental health are optional." />
      <Card>
        <H3>4. Who can see what</H3>
        <VisSelect k="interests" label="Who sees my interests" />
        <VisSelect k="subs" label="Who sees my drug use" />
        <VisSelect k="mh" label="Who sees my mental health" />
      </Card>
      <ErrorText id="su-err" text={err} />
      <Btn variant="primary" block label="Save profile and see my matches" onPress={save} />
    </>
  );
}
