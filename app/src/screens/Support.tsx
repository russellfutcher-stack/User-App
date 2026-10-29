// The Support page, copied from the prototype (renderSupport): peer supporters, a message for you, help services by country,
// overdose information and asking for a review.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { backend, Member, Review } from '../backend';
import { SERVICES, Service, UPLIFT } from '../data/support';
import { STAGES } from '../data/reference';
import { useApp } from '../state/app';
import { B, Bullet, Btn, Card, Disclaimer, H2, H3, Label, P, Pill, Row, Select, s as ui } from '../components/ui';
import { ReviewSheet } from './Safety';
import { C, F } from '../theme';

const stageLabel = (id: string) => STAGES.find(s => s.id === id)?.label || '';

function Services({ s }: { s: Service }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={[ui.line, { backgroundColor: C.dangerSoft }]}>
        <Text style={[ui.p, ui.small, { fontFamily: F.bold }]}>Emergency</Text>
        <Text selectable style={[ui.p, { fontFamily: F.displayBold, fontSize: 14 }]}>{s.emergency}</Text>
      </View>
      {s.lines.map(([a, b]) => (
        <View key={a} style={ui.line}>
          <Text style={[ui.p, ui.small, { flexShrink: 1 }]}>{a}</Text>
          <Text selectable style={[ui.p, { fontFamily: F.displayBold, fontSize: 14, textAlign: 'right', flexShrink: 1 }]}>{b}</Text>
        </View>))}
    </View>
  );
}

export function Support() {
  const { profile, update, openSheet, setTab, setView, chatsVer, sheet } = useApp();
  const [peers, setPeers] = useState<Member[] | null>(null); const [allPeers, setAllPeers] = useState(false);
  const [next, setNext] = useState(0); const [allCountries, setAllCountries] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    let live = true;
    backend.members().then(l => { if (live) setPeers(l.filter(m => m.isPeer).sort((a, b) => b.pct - a.pct)); }).catch(() => { if (live) setPeers([]); });
    backend.reviews().then(r => { if (live) setReviews(r); }).catch(() => undefined);
    return () => { live = false; };
  }, [chatsVer, !sheet]); // eslint-disable-line react-hooks/exhaustive-deps -- reloads when a sheet (such as a new review) closes
  if (!profile) return null;
  const day = Math.floor(Date.now() / 86400000);
  const here = SERVICES.find(s => s.country === profile.country) || SERVICES[0];
  const shown = allPeers ? peers || [] : (peers || []).slice(0, 5);
  return (
    <>
      <View><H2>Support</H2><P muted small>Help, information and people who have been there.</P></View>

      <Card>
        <H2>Peer supporters</H2>
        <P small muted>Members with lived experience who offer to listen. {profile.wantsPeer ? 'You asked for peer support, so they appear first in your matches.' : 'Turn on peer support on the Me page to have them shown first in your matches.'}</P>
        <View style={{ gap: 12 }} id="peers">
          {shown.map(p => (
            <View key={p.username} testID="peer" style={{ gap: 4 }}>
              <Row><Text style={[ui.p, { fontFamily: F.bold }]}>{p.username}</Text><Pill peer text="Peer supporter" /></Row>
              <P small muted>{stageLabel(p.stage)}</P>
              <P small>{p.byline}</P>
              <Btn sm label={`Ask ${p.username} for support`} style={{ alignSelf: 'flex-start' }} onPress={() => { setTab('chat'); setView({ name: 'chat', with: p.username }); }} />
            </View>))}
        </View>
        {peers && peers.length > 5 ? <Btn sm style={{ alignSelf: 'flex-start' }} label={allPeers ? 'Show fewer' : `Show all ${peers.length} peer supporters`} onPress={() => setAllPeers(!allPeers)} /> : null}
        {profile.isPeer
          ? <Row><Pill peer text="Peer supporter" /><P small>You are listed as a peer supporter too.</P></Row>
          : <P hint>Want to help others? Nominate yourself under Peer support on the Me page.</P>}
      </Card>

      <Card tone="warm">
        <Label>A message for you</Label>
        <View aria-live="polite"><Text id="uplift" style={[ui.p, { fontFamily: F.display, fontSize: 19, lineHeight: 26 }]}>{UPLIFT[(day + next) % UPLIFT.length]}</Text></View>
        <Btn sm style={{ alignSelf: 'flex-start' }} label="Another message" onPress={() => setNext(next + 1)} />
      </Card>

      <Card>
        <H2>Help services by country</H2>
        <Select label="Your country" id="country" value={here.country} options={SERVICES.map(s => ({ id: s.country, label: s.country }))} onChange={c => update({ country: c })} />
        <View id="services"><Services s={here} /></View>
        <Btn sm variant="quiet" style={{ alignSelf: 'flex-start' }} label={allCountries ? 'Hide other countries' : `Show all ${SERVICES.length} countries`} onPress={() => setAllCountries(!allCountries)} />
        {allCountries ? <View style={{ gap: 14 }} id="all-countries">{SERVICES.map(s => <View key={s.country} style={{ gap: 6 }}><H3>{s.country}</H3><Services s={s} /></View>)}</View> : null}
        <P hint>Numbers are shown as text so you can copy or dial them. Services can change. If a number doesn't work, findahelpline.com lists services worldwide.</P>
      </Card>

      <Card>
        <H2>Overdose information</H2>
        <P small bold>If you think someone has overdosed, call your emergency number now.</P>
        <H3>Signs of an opioid overdose</H3>
        <Bullet>Won't wake up or respond to their name or a firm rub on the breastbone</Bullet>
        <Bullet>Slow, shallow or stopped breathing, or gurgling and snoring sounds</Bullet>
        <Bullet>Blue or grey lips and fingertips</Bullet>
        <Bullet>Tiny, pinpoint pupils</Bullet>
        <H3>Signs of a stimulant overdose</H3>
        <Bullet>Chest pain, a racing heart or trouble breathing</Bullet>
        <Bullet>Very hot, sweaty skin or a high temperature</Bullet>
        <Bullet>Fits or seizures, severe confusion or panic</Bullet>
        <H3>What to do</H3>
        <P small>1. Call your emergency number and say someone isn't breathing or won't wake up.</P>
        <P small>2. If you have naloxone, give it. It only reverses opioids, but it won't harm someone who hasn't taken them. Give another dose after 2 to 3 minutes if there's no response.</P>
        <P small>3. If they're breathing, put them in the recovery position on their side. If not, follow the call handler's instructions.</P>
        <P small>4. Stay with them until help arrives. Naloxone can wear off before the drugs do.</P>
        <P small>5. For overheating, move them somewhere cool and quiet and keep them calm.</P>
        <H3>Lower your risk</H3>
        <Bullet>Don't use alone. If you do, tell someone or use a never-use-alone service.</Bullet>
        <Bullet>Mixing opioids, benzodiazepines and alcohol greatly raises the risk.</Bullet>
        <Bullet>Your tolerance drops fast after a break, a hospital stay or prison.</Bullet>
        <Bullet>Street drugs may contain fentanyl or nitazenes. Use test strips where they're available, and start with a small amount.</Bullet>
        <Bullet>Carry naloxone. Many pharmacies and drug services give it out free.</Bullet>
        <P hint>In many places, laws protect people who call for help at an overdose. Check what applies where you live.</P>
      </Card>

      <Card>
        <H2>Ask for a review</H2>
        <P small muted>If you think a safety decision was wrong, ask for a review. Every review is decided straight away, and an independent arbitrator checks decisions and can change them.</P>
        <Btn style={{ alignSelf: 'flex-start' }} label="Ask for a review" onPress={() => openSheet(<ReviewSheet />)} />
        {reviews.length ? (
          <View style={{ gap: 10 }} id="my-reviews" aria-label="Your reviews">
            {reviews.map(r => (
              <View key={r.id} testID="my-review" style={{ gap: 4 }}>
                <View style={ui.line}>
                  <Text style={[ui.p, ui.small, { flexShrink: 1 }]}><B>{r.id}</B> · {r.topic}{r.auto ? ' · raised automatically' : ''}{'\n'}<Text style={{ color: C.muted }}>Reply by {r.due}</Text></Text>
                  <Pill text={r.status} />
                </View>
                {r.note ? <P small>{r.by === 'arbitrator' ? <B>Arbitrator: </B> : null}{r.note}</P> : null}
              </View>))}
          </View>) : null}
      </Card>
      <Disclaimer />
    </>
  );
}
