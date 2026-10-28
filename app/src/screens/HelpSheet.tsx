import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/app';
import { Btn, Card, H2, H3, P, s as ui } from '../components/ui';
import { F } from '../theme';

// Copied from the prototype's Help sheet. Check every number before launch.
const LINES: [string, string][] = [
  ['United States & Canada', 'Call or text 988'], ['UK & Ireland · Samaritans', '116 123'], ['Australia · Lifeline', '13 11 14'],
  ['New Zealand · Need to talk?', 'Call or text 1737'], ['Overdose or danger', 'Call your emergency number: 911 · 999 · 112 · 000'],
  ['US · Never Use Alone', '1-800-484-3731'], ['UK · FRANK drugs helpline', '0300 123 6600']];

export function HelpSheet({ intro }: { intro?: string }) {
  const { closeSheet, setTab, profile } = useApp();
  return (
    <>
      <H2>{intro ? "You don't have to hold this alone" : 'Help now'}</H2>
      <P>{intro || 'If you are in danger or someone may have overdosed, call emergency services now. If you have naloxone, use it and stay with them.'}</P>
      <View style={{ gap: 8 }}>
        {LINES.map(([a, b]) => (
          <View key={a} style={ui.line}>
            <Text style={[ui.p, ui.small, { flexShrink: 1 }]}>{a}</Text>
            <Text selectable style={[ui.p, { fontFamily: F.displayBold, fontSize: 14, textAlign: 'right', flexShrink: 1 }]}>{b}</Text>
          </View>))}
      </View>
      <P hint>Numbers are shown as text so you can copy or dial them. In the full app these are localised to your region and tap-to-call.</P>
      <Card tone="calm"><H3>Grounding, right now</H3><P small>Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste. Breathe out longer than you breathe in.</P></Card>
      <Btn block label="See help services for every country" onPress={() => { closeSheet(); if (profile) setTab('support'); }} />
      <Btn block variant="quiet" label="Close" onPress={closeSheet} />
    </>
  );
}
