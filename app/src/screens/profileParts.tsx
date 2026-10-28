// Parts shared by profile setup and the Me page.
import React from 'react';
import { Text, View } from 'react-native';
import { CATS, LOOKING, PATHS, REF, STAGES, TAG_CAT, VIS, VisKey } from '../data/reference';
import { useApp } from '../state/app';
import { Card, Chip, Chips, Field, H2, Label, P, Pill, Row, Select, Toggle } from '../components/ui';
import { C, F } from '../theme';

const GROUP_COLOUR = { int: C.int, drug: C.drug, mh: C.mh };

// "Your three choices": Interests, Drug use and Mental health, each with an "[n] added" counter.
export function ThreeChoices({ heading, foot }: { heading: React.ReactNode; foot: string }) {
  const { profile, update } = useApp();
  if (!profile) return null;
  const toggleTag = (id: string) => {
    const t = profile.tags.includes(id) ? profile.tags.filter(x => x !== id) : [...profile.tags, id];
    update({ tags: t });
  };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>{heading}<Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.muted }}>Tap to add or remove</Text></Row>
      {PATHS.map(g => {
        const n = profile.tags.filter(t => g.cats.includes(TAG_CAT[t])).length;
        return (
          <View key={g.key} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: GROUP_COLOUR[g.g] }} />
                <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{g.name}</Text>
              </Row>
              <Pill id={`cnt-${g.key}`} text={`${n} added`} />
            </Row>
            {g.cats.map(c => {
              const cat = CATS.find(x => x.key === c)!;
              return (
                <View key={c} style={{ gap: 8 }}>
                  {g.cats.length > 1 ? <Label>{cat.name}</Label> : null}
                  <Chips label={`${g.name}: ${cat.name}`}>
                    {REF[c].map(t => <Chip key={t.id} label={t.label} on={profile.tags.includes(t.id)} onPress={() => toggleTag(t.id)} />)}
                  </Chips>
                </View>
              );
            })}
          </View>
        );
      })}
      <P hint>{foot}</P>
    </Card>
  );
}

// Byline (setup only), where are you at, and what you're looking for.
export function AboutFields({ withByline }: { withByline: boolean }) {
  const { profile, update } = useApp();
  if (!profile) return null;
  const look = (id: string) => update({ looking: profile.looking.includes(id) ? profile.looking.filter(x => x !== id) : [...profile.looking, id] });
  return (
    <>
      {withByline ? <Field label="Your byline: one line about you (optional)" id="su-bio" multiline numberOfLines={3} maxLength={240}
        value={profile.byline} onChangeText={v => update({ byline: v })} placeholder="e.g. Dog person, three months into cutting down." /> : null}
      <Select label="Where are you at?" id="su-stage" value={profile.stage} options={STAGES} onChange={v => update({ stage: v })} />
      <View style={{ gap: 10 }}>
        <Label>I'm looking for</Label>
        <Chips label="I'm looking for">{LOOKING.map(l => <Chip key={l.id} label={l.label} on={profile.looking.includes(l.id)} onPress={() => look(l.id)} />)}</Chips>
      </View>
    </>
  );
}

export function VisSelect({ k, label }: { k: VisKey; label: string }) {
  const { profile, update, toast } = useApp();
  if (!profile) return null;
  return <Select label={label} id={`vis-${k}`} value={profile.vis[k]} options={VIS}
    onChange={v => { update({ vis: { ...profile.vis, [k]: v } }); if (profile.setupDone) toast('Visibility updated.'); }} />;
}

export function PeerCard() {
  const { profile, update, toast } = useApp();
  if (!profile) return null;
  return (
    <Card>
      <H2>Peer support</H2>
      <P small muted>Peer supporters are members with lived experience who offer to listen. People who ask for peer support are matched with them first.</P>
      <Toggle id="pe-want" label="I would like peer support" hint="You'll see peer supporters at the top of your matches." value={!!profile.wantsPeer}
        onChange={v => { update({ wantsPeer: v }); toast(v ? 'Peer support turned on. Peer supporters will show first in your matches.' : 'Peer support turned off.'); }} />
      <Toggle id="pe-be" label="Nominate myself as a peer supporter"
        hint="You agree to listen without judgement, never give medical or dosing advice, and point people to Help now if they're at risk."
        value={profile.isPeer} onChange={v => { update({ isPeer: v }); toast(v ? 'You are now a peer supporter. Thank you.' : 'You are no longer listed as a peer supporter.'); }} />
      {profile.isPeer ? <View role="status" id="peer-on" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Pill peer text="Peer supporter" /><P small>People who want peer support can now be matched with you.</P></View> : null}
    </Card>
  );
}
