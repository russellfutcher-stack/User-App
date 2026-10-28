// Shown straight after profile setup: everyone, by match score.
import React from 'react';
import { View } from 'react-native';
import { useApp } from '../state/app';
import { Btn, H2, P } from '../components/ui';
import { byScore, PersonRow, useMembers } from './people';

export function Matches() {
  const { profile, setMatches, setTab } = useApp();
  const members = useMembers();
  if (!profile) return null;
  const leave = (t: 'home' | 'find') => { setMatches(false); setTab(t); };
  return (
    <>
      <View style={{ gap: 10 }}>
        <H2>Here are your matches, {profile.username}</H2>
        <P muted>Based on your interests, drug use, mental health and what you're looking for.{profile.wantsPeer ? ' Peer supporters are marked, because you asked for peer support.' : ''} Tap anyone to see their profile and say hi.</P>
      </View>
      <View style={{ gap: 10 }} id="match-list">
        {members ? byScore(members).map(m => <PersonRow key={m.username} m={m} />) : <P muted>Finding your matches…</P>}
      </View>
      <Btn variant="primary" block label="Continue to Home" onPress={() => leave('home')} />
      <Btn block label="Refine on the Search page" onPress={() => leave('find')} />
    </>
  );
}
