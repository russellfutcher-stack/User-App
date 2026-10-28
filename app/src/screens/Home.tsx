import React from 'react';
import { View } from 'react-native';
import { PathKey } from '../data/reference';
import { useApp } from '../state/app';
import { B, Card, Disclaimer, H2, H3, Label, P } from '../components/ui';
import { AboutUser } from './Welcome';
import { stageLabel, ThreeTiles, useMembers } from './people';

const greeting = (h: number) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

// Greeting, choice tiles, new messages, benefits, how to use, help card, disclaimer.
// New messages arrive with chats in step 3; until then there are none, so the section is hidden.
export function Home() {
  const { profile, query, setQuery, setApplied, setTab } = useApp();
  const members = useMembers();
  if (!profile) return null;
  const open = (k: PathKey) => {
    const q = query.cats.includes(k) ? query : { ...query, cats: [...query.cats, k] };
    setQuery(q); setApplied(q); setTab('find');
  };
  return (
    <>
      <View>
        <H2>{greeting(new Date().getHours())}, {profile.username}.</H2>
        <P small muted>{stageLabel(profile.stage)}</P>
      </View>
      <View style={{ gap: 10 }}>
        <Label>Find people using these three choices</Label>
        <ThreeTiles members={members} onPress={open} />
      </View>
      <AboutUser />
      <Card tone="calm">
        <View id="help-card" style={{ gap: 8 }}>
          <H3>Help is always here</H3>
          <P small>Tap <B>Help now</B> at the top of any screen, or open the <B>Support</B> page for help services in your country, overdose information and peer supporters.</P>
        </View>
      </Card>
      <Disclaimer />
    </>
  );
}
export function Later({ name }: { name: string }) {
  return <Card><H2>{name}</H2><P muted>Coming in a later build step.</P></Card>;
}
