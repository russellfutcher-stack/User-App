// The Search page: Your Matches at the top, then the three choices, Looking for and the Search button.
import React from 'react';
import { Text, View } from 'react-native';
import { CATS, LOOKING, PATHS, PathKey, REF, TAG_CAT } from '../data/reference';
import { Member } from '../backend';
import { blankQuery, sameQuery, search } from '../lib/match';
import { useApp } from '../state/app';
import { Btn, Card, Chip, Chips, H2, Label, P, Pill, Row, s as ui } from '../components/ui';
import { C, F } from '../theme';
import { choiceName, GROUP_COLOUR, PersonRow, PlainTag, Tag, ThreeTiles, useMembers } from './people';

const GHead = ({ text, colour }: { text: string; colour: string }) => (
  <Row style={{ gap: 8 }}>
    <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: C.frame, backgroundColor: colour }} />
    <Text role="heading" aria-level={3} style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{text}</Text>
  </Row>
);

function Results({ members }: { members: Member[] | null }) {
  const { applied, showAll, setShowAll } = useApp();
  if (!members) return <P muted>Finding your matches…</P>;
  const list = search(members, applied), shown = showAll ? list : list.slice(0, 3);
  return (
    <View style={{ gap: 10 }} id="results" aria-live="polite">
      <Row style={{ justifyContent: 'space-between' }}><H2>Your Matches</H2><Pill id="match-count" text={`${list.length} ${list.length === 1 ? 'person' : 'people'}`} /></Row>
      {list.length ? <>
        {shown.map(m => <PersonRow key={m.username} m={m} />)}
        {list.length > 3 ? <Btn sm style={{ alignSelf: 'flex-start' }} label={showAll ? 'Show top 3' : `Show all ${list.length} matches`} onPress={() => setShowAll(!showAll)} /> : null}
      </> : <Card><P>No one matches all of those yet. Try removing a filter, or join a room to meet people more broadly.</P></Card>}
    </View>
  );
}

export function Search({ toTop }: { toTop: () => void }) {
  const { query, setQuery, applied, setApplied, toast } = useApp();
  const members = useMembers();
  const on = PATHS.filter(p => query.cats.includes(p.key));
  const toggle = (k: PathKey) => {
    if (query.cats.includes(k)) { const cs = PATHS.find(p => p.key === k)!.cats; setQuery({ ...query, cats: query.cats.filter(x => x !== k), f: query.f.filter(t => !cs.includes(TAG_CAT[t])) }); }
    else setQuery({ ...query, cats: [...query.cats, k] });
  };
  const flip = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const run = () => {
    setApplied(query); toTop();
    const n = members ? search(members, query).length : 0;
    toast(`Search updated: ${n} ${n === 1 ? 'person' : 'people'}.`);
  };
  const clear = () => { setQuery(blankQuery()); setApplied(blankQuery()); };
  const any = query.f.length || query.look.length || query.peerOnly;
  return (
    <>
      <H2 style={{ fontSize: 24, lineHeight: 28 }}>Search/Find a Companion</H2>
      <Results members={members} />
      <View style={{ gap: 10 }}>
        <Label>1. Choose</Label>
        <ThreeTiles on={query.cats} onPress={toggle} />
        <P hint>{on.length === 3 ? 'All three are on. ' : ''}Tap a choice to turn it off or on, then pick items in each to combine them.</P>
      </View>
      {on.map((g, i) => (
        <View key={g.key} style={{ gap: 10 }} id={`choice-${g.key}`}>
          <GHead text={`${i + 2}. ${choiceName(g.key)}`} colour={GROUP_COLOUR[g.g]} />
          {g.cats.map(c => {
            const cat = CATS.find(x => x.key === c)!;
            return (
              <View key={c} style={{ gap: 8 }}>
                {g.cats.length > 1 ? <Label>{cat.name}</Label> : null}
                <Chips label={`${choiceName(g.key)}: ${cat.name}`}>
                  {REF[c].map(t => <Chip key={t.id} label={t.label} on={query.f.includes(t.id)} onPress={() => setQuery({ ...query, f: flip(query.f, t.id) })} />)}
                </Chips>
              </View>
            );
          })}
        </View>
      ))}
      {any ? (
        <Card tone="calm">
          <View id="summary" style={{ gap: 10 }}>
            <Label>Finding people with</Label>
            <View style={ui.chips}>
              {query.f.map(t => <Tag key={t} id={t} />)}
              {query.look.map(l => <PlainTag key={l} text={LOOKING.find(x => x.id === l)!.label} />)}
              {query.peerOnly ? <PlainTag text="Peer supporters only" /> : null}
            </View>
            <P hint>Matches at least one pick in each choice you used.</P>
            <Btn sm style={{ alignSelf: 'flex-start' }} label="Clear all filters" onPress={clear} />
          </View>
        </Card>
      ) : null}
      <View style={{ gap: 10 }}>
        <GHead text={`${on.length + 2}. Looking for`} colour={C.look} />
        <P hint>Find people who can meet what you're looking for. These also count towards the match score.</P>
        <Chips label="Looking for">
          {LOOKING.map(l => <Chip key={l.id} label={l.label} on={query.look.includes(l.id)} onPress={() => setQuery({ ...query, look: flip(query.look, l.id) })} />)}
          <Chip label="Peer supporters only" on={query.peerOnly} onPress={() => setQuery({ ...query, peerOnly: !query.peerOnly })} />
        </Chips>
      </View>
      {!sameQuery(query, applied) ? <P hint id="pending">You have changed your search. Tap Search to update Your Matches.</P> : null}
      <Btn variant="primary" block label="Search" onPress={run} />
    </>
  );
}
