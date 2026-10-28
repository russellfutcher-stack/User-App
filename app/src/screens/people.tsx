// Parts shared by Home, Search and the matches screen: the three choice tiles, person cards and the profile sheet.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { backend, Member } from '../backend';
import { LOOKING, PATHS, PathKey, STAGES, TAG_CAT } from '../data/reference';
import { groupOf, shared, tagLabel, whyMatched } from '../lib/match';
import { useApp } from '../state/app';
import { Btn, Card, H2, Label, P, Pill, Row, s as ui } from '../components/ui';
import { C, F } from '../theme';

export const stageLabel = (id: string) => STAGES.find(x => x.id === id)?.label || '';
export const choiceName = (key: PathKey) => (key === 'interests' ? 'Interest' : PATHS.find(p => p.key === key)!.name); // singular on Home and Search
const EXAMPLES: Record<PathKey, string> = { interests: 'Walks, pets, films, books, music', drugs: 'Prescription, other substances, alcohol', mh: 'Depression, anxiety, PTSD, ADHD' };
const TILE = { int: { bg: C.int, ink: C.ink }, drug: { bg: C.drug, ink: '#fff' }, mh: { bg: C.mh, ink: '#fff' } };
export const GROUP_COLOUR = { int: C.int, drug: C.drug, mh: C.mh };

function PathIcon({ k, color }: { k: PathKey; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {k === 'interests' && <Path {...p} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />}
      {k === 'drugs' && <><Rect {...p} x={3} y={9} width={18} height={6} transform="rotate(-35 12 12)" /><Path {...p} d="M9.6 8.6l4.8 6.8" /></>}
      {k === 'mh' && <Path {...p} d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V5a1 1 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0" />}
    </Svg>
  );
}

// On Home each tile shows how many people have tags in that choice and opens Search. On Search it turns the choice on or off.
export function ThreeTiles({ members, on, onPress }: { members?: Member[] | null; on?: PathKey[]; onPress: (k: PathKey) => void }) {
  return (
    <View role="group" aria-label="Three ways to connect" style={{ flexDirection: 'row', gap: 10 }}>
      {PATHS.map(p => {
        const t = TILE[p.g], pressed = on ? on.includes(p.key) : undefined;
        const n = members ? members.filter(m => m.tags.some(x => p.cats.includes(TAG_CAT[x]))).length : null;
        const foot = on ? (pressed ? '✓ On' : '✕ Off') : n === null ? '…' : `${n} people`;
        return (
          <Pressable key={p.key} role="button" aria-pressed={pressed} aria-label={`${choiceName(p.key)}, ${foot.replace(/^[✓✕] /, '')}`} id={`tile-${p.key}`} onPress={() => onPress(p.key)}
            style={{ flex: 1, minWidth: 0, backgroundColor: t.bg, borderWidth: 2, borderColor: C.frame, paddingVertical: 10, paddingHorizontal: 9, gap: 6, opacity: pressed === false ? 0.45 : 1 }}>
            <View style={{ width: 30, height: 30, borderWidth: 2, borderColor: t.ink, alignItems: 'center', justifyContent: 'center' }}><PathIcon k={p.key} color={t.ink} /></View>
            <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 20, color: t.ink }}>{choiceName(p.key)}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 11.5, lineHeight: 14, color: t.ink, opacity: 0.92 }}>{EXAMPLES[p.key]}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase', color: t.ink, borderTopWidth: 1, borderTopColor: t.ink, paddingTop: 5, marginTop: 'auto' }}>{foot}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Tag({ id, on }: { id: string; on?: boolean }) {
  return (
    <Text testID="tag" style={{ fontFamily: on ? F.bold : F.body, fontSize: 12.5, color: C.ink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden',
      backgroundColor: on ? C.hl : C.surface2, borderWidth: 1, borderColor: on ? C.frame : C.line, borderLeftWidth: 5, borderLeftColor: GROUP_COLOUR[groupOf(id)] }}>{tagLabel(id)}</Text>
  );
}
export const PlainTag = ({ text }: { text: string }) => (
  <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden', backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line }}>{text}</Text>
);

const Pct = ({ pct }: { pct: number }) => (
  <View style={{ alignItems: 'flex-end' }}>
    <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 20, color: C.sage }}>{pct}%</Text>
    <Text style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: C.muted }}>match</Text>
  </View>
);
const Where = (m: Member) => [stageLabel(m.stage), m.region].filter(Boolean).join(' · ');

// Name, Peer supporter badge, status, stage, region, up to 4 tags (interests and shared ones) and the match score.
export function PersonRow({ m }: { m: Member }) {
  const { profile, openSheet } = useApp();
  if (!profile) return null;
  const both = shared(profile, m);
  const tags = m.tags.filter(t => TAG_CAT[t] === 'interests' || both.includes(t)).slice(0, 4);
  return (
    <Pressable role="button" aria-label={`${m.username}, ${m.pct}% match`} testID="person" onPress={() => openSheet(<ProfileSheet m={m} />)}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.frame, borderRadius: 16 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          <Text style={[ui.p, ui.b, { fontSize: 15.5 }]}>{m.username}</Text>
          {m.isPeer ? <Pill peer text="Peer supporter" /> : null}
          {m.active === 'Online' ? <View aria-label="online" style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.sage }} />
            : m.active ? <Text style={[ui.hint, { fontSize: 13 }]}>{m.active}</Text> : null}
        </Row>
        <Text style={[ui.hint, { fontSize: 13 }]}>{Where(m)}</Text>
        {tags.length ? <View style={ui.chips}>{tags.map(t => <Tag key={t} id={t} on={both.includes(t)} />)}</View> : null}
      </View>
      <Pct pct={m.pct} />
    </Pressable>
  );
}

export function ProfileSheet({ m }: { m: Member }) {
  const { profile, closeSheet, setTab, setMatches, toast, membersChanged } = useApp();
  if (!profile) return null;
  const both = shared(profile, m);
  const block = async () => {
    try { await backend.block(m.username); } catch { toast("Couldn't block. Check your connection and try again."); return; }
    closeSheet(); membersChanged(); toast(`${m.username} is blocked. They can't see or message you.`);
  };
  return (
    <>
      <Row>
        <View style={{ flex: 1, minWidth: 0 }}><H2>{m.username}</H2><Text style={[ui.hint, { fontSize: 13 }]}>{[m.active, m.region].filter(Boolean).join(' · ')}</Text></View>
        <Pct pct={m.pct} />
      </Row>
      {m.isPeer ? <Row style={{ gap: 8, flexWrap: 'wrap' }}><Pill peer text="Peer supporter" /><P small>Offers to listen to people who want peer support.</P></Row> : null}
      {m.byline ? <P>{m.byline}</P> : null}
      <Card tone="calm"><P small>{whyMatched(profile, m)}</P></Card>
      <View style={{ gap: 6 }}><Label>Where they're at</Label><P>{stageLabel(m.stage)}</P></View>
      {PATHS.map(g => {
        const t = m.tags.filter(x => g.cats.includes(TAG_CAT[x]));
        return (
          <View key={g.key} style={{ gap: 8 }}>
            <Row style={{ gap: 8 }}><View style={{ width: 18, height: 18, borderWidth: 2, borderColor: C.frame, backgroundColor: GROUP_COLOUR[g.g] }} /><Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{g.name}</Text></Row>
            <View style={ui.chips}>{t.length ? t.map(x => <Tag key={x} id={x} on={both.includes(x)} />) : <Text style={[ui.hint, { fontSize: 13 }]}>Not shared</Text>}</View>
          </View>
        );
      })}
      <View style={{ gap: 8 }}><Label>Looking for</Label><View style={ui.chips}>{m.looking.map(l => <PlainTag key={l} text={LOOKING.find(x => x.id === l)?.label || l} />)}</View></View>
      {/* Chats arrive in step 3 and reports in step 4. */}
      <Btn variant="primary" block label="Say hi" onPress={() => { closeSheet(); setMatches(false); setTab('chat'); }} />
      <Row>
        <Btn variant="danger" sm label="Block" onPress={block} />
        <Btn sm label="Report" onPress={() => toast('Reporting opens here.')} />
      </Row>
    </>
  );
}

// Everyone you can match with, reloaded after a block or a profile change.
export function useMembers() {
  const { membersVer, profile, toast } = useApp();
  const [list, setList] = useState<Member[] | null>(null);
  useEffect(() => {
    let live = true;
    backend.members().then(l => { if (live) setList(l); }).catch(() => { if (live) { setList([]); toast('Something went wrong reaching User. Check your connection and try again.'); } });
    return () => { live = false; };
  }, [membersVer, profile?.tags, profile?.stage, profile?.looking, profile?.wantsPeer, profile?.isPeer]); // eslint-disable-line react-hooks/exhaustive-deps
  return list;
}
export const byScore = (l: Member[]) => [...l].sort((a, b) => b.pct - a.pct);
