// The arbitrator dashboard, copied from the prototype (renderDashboard, openCase, decide). On the server the figures
// and cases are live; in the demo the figures are samples and cases raised in this browser are marked "This browser".
// Members are shown by username only.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { backend, ArbCase, ArbFigures, ArbOutcome } from '../backend';
import { SURE } from '../lib/review';
import { useApp } from '../state/app';
import { B, Btn, Card, ErrorText, H2, H3, P, Row, s as ui } from '../components/ui';
import { C, F, R } from '../theme';

const fmt = (n: number) => n.toLocaleString('en-GB');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
// What the safety check's categories are called on the dashboard.
const CATEGORY: Record<string, string> = {
  dealing: 'Buying or selling drugs', off_app_contact: 'Links and other apps', harassment: 'Harassment', hate: 'Hate',
  sexual: 'Sexual content', spam: 'Spam or scam', under_18: 'Under 18', other: 'Something else',
};

function Figs({ rows, id }: { rows: [string, string][]; id?: string }) {
  return (
    <View style={s.figs} id={id}>
      {rows.map(([v, k]) => <View key={k} style={s.fig}><Text style={s.figV}>{v}</Text><Text style={s.figK}>{k}</Text></View>)}
    </View>
  );
}
function Bars({ rows, label, id }: { rows: [string, number][]; label: string; id?: string }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  if (!rows.length) return <P small muted>Nothing yet.</P>;
  return (
    <View role="list" aria-label={label} style={{ gap: 6 }} id={id}>
      {rows.map(([k, v]) => (
        <View key={k} role="listitem" style={{ gap: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}><Text style={[ui.p, ui.small]}>{CATEGORY[k] || k}</Text><Text style={[ui.p, ui.small, { fontFamily: F.bold }]}>{fmt(v)}</Text></Row>
          <View style={s.track}><View style={[s.bar, { width: `${(v / max) * 100}%` }]} /></View>
        </View>))}
    </View>
  );
}
const SampleTag = ({ on }: { on: boolean }) => (on ? <Text style={[ui.pill, { alignSelf: 'flex-start' }]}>Sample</Text> : null);

function CaseSheet({ c, done }: { c: ArbCase; done: () => void }) {
  const { closeSheet, toast } = useApp();
  const [note, setNote] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const decide = async (outcome: ArbOutcome) => {
    if (note.trim().length < 5) return setErr('Add a short note explaining your decision.');
    setBusy(true); const r = await backend.arbDecide(c.id, outcome, note.trim()).catch(() => null); setBusy(false);
    if (!r?.ok) return setErr(r?.error || 'Something went wrong reaching User. Check your connection and try again.');
    closeSheet(); done(); toast(`${c.id} decided: ${outcome}.`);
  };
  return (
    <>
      <H2>{c.id}: {c.topic}</H2>
      <View style={{ gap: 6 }}>
        {[['Member', c.member || '-'], ['Raised by', c.raised], ['Reply due', c.due], ['Status', c.status]].map(([k, v]) => (
          <View key={k} style={ui.line}><Text style={[ui.p, ui.small]}>{k}</Text><Text style={[ui.p, { fontFamily: F.bold }]}>{v}</Text></View>))}
      </View>
      <Card tone="calm"><H3>What happened</H3><P small>{c.text}</P></Card>
      <Card tone="warm" style={{ gap: 6 }}>
        <H3>AI Review Agent</H3>
        <P small><B>{c.status.replace(/^Decided: /, '')}</B> · {Math.round(c.confidence * 100)}% confident{c.flagged ? ' · flagged for a check' : ''}</P>
        <P small>{c.reason}</P>
        {c.note ? <P small muted>{c.by === 'arbitrator' ? 'Arbitrator' : 'Note to the member'}: {c.note}</P> : null}
      </Card>
      <View style={ui.field}>
        <Text style={ui.fieldLabel}>Your decision note (shown to the member)</Text>
        <TextInput id="arb-note" aria-label="Your decision note (shown to the member)" multiline numberOfLines={3} maxLength={400} value={note}
          onChangeText={t => { setNote(t); setErr(''); }} placeholder="Explain the decision in plain words." placeholderTextColor={C.muted} style={[ui.input, { minHeight: 76 }]} />
      </View>
      <ErrorText id="arb-err" text={err} />
      <Row style={{ flexWrap: 'wrap' }}>
        <Btn sm variant="primary" label="Uphold the decision" disabled={busy} onPress={() => decide('Upheld')} />
        <Btn sm label="Overturn it" disabled={busy} onPress={() => decide('Overturned')} />
        <Btn sm label="Change the action" disabled={busy} onPress={() => decide('Action changed')} />
      </Row>
    </>
  );
}

export function Dashboard() {
  const { openSheet, toast, signOut } = useApp();
  const [f, setF] = useState<ArbFigures | null>(null); const [cases, setCases] = useState<ArbCase[] | null>(null);
  const load = useCallback(() => {
    Promise.all([backend.arbFigures(), backend.arbCases()]).then(([a, b]) => { setF(a); setCases(b); })
      .catch(() => toast("Couldn't load the dashboard. Check your connection and try again."));
  }, [toast]);
  useEffect(load, [load]);
  if (!f || !cases) return <P muted>Loading…</P>;
  const flagged = cases.filter(c => c.flagged && c.by === 'automatic'), urgent = cases.filter(c => c.urgent);
  return (
    <>
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}><H2>Arbitrator dashboard</H2><Btn sm variant="quiet" label="Sign out" onPress={signOut} /></Row>
        <P small muted>How User is working, and how the AI Review Agent is deciding cases. {f.sample ? 'Figures marked as samples stand in for the live service in this demo. ' : ''}Members are shown by username only.</P>
      </View>
      <Figs id="kpis" rows={[[fmt(f.activeToday), 'active today'], [fmt(f.activeWeek), 'active in the last 7 days'], [fmt(f.newMembers), 'new members this week'],
        [fmt(f.peers), 'peer supporters'], [fmt(f.wantPeers), 'members who want peer support'], [String(flagged.length), 'flagged for a check'], [String(urgent.length), 'urgent cases']]} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>Review queue</H2><Text style={[ui.pill, s.amber]}>{flagged.length} flagged</Text></Row>
        <P small muted>The AI Review Agent decides every case. Danger, under-18 and account removal cases are decided first, within minutes. When it is less than {Math.round(SURE * 100)}% confident it still decides, using the safest outcome, and flags the case for you to check.</P>
        <H3>Decided ({cases.length})</H3>
        <View style={{ gap: 8 }} id="cases">
          {cases.length ? cases.map(c => (
            <View key={c.id + (c.member || '')} testID="case" style={[s.case, c.urgent && s.urgent]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[ui.p, { fontFamily: F.bold }]}>{c.id}</Text>
                <Row>{c.live ? <Text style={ui.pill}>This browser</Text> : null}{c.urgent ? <Text style={[ui.pill, s.red]}>Urgent</Text> : null}</Row>
              </Row>
              <P small>{c.topic}{c.member ? ` · ${c.member}` : ''}</P>
              <P small muted>Raised by {c.raised} · due {c.due} · {Math.round(c.confidence * 100)}% confident</P>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Row style={{ flexWrap: 'wrap' }}>
                  <Text style={ui.pill}>{c.status}</Text>
                  {c.flagged && c.by === 'automatic' ? <Text style={[ui.pill, s.amber]}>Flagged</Text> : null}
                  <Text style={[ui.p, ui.small, { color: C.muted }]}>by {c.by === 'arbitrator' ? 'Arbitrator' : 'AI Review Agent'}</Text>
                </Row>
                <Btn sm label="Check" onPress={() => openSheet(<CaseSheet c={c} done={load} />)} />
              </Row>
            </View>)) : <P small muted>Nothing here.</P>}
        </View>
        <P hint>You can check any decision and change it. Flagged and urgent cases are worth checking first.</P>
        <Figs rows={[[`${pct(f.autoDecided, f.reviewsWeek)}%`, 'of reviews decided automatically this week'],
          [f.autoSeconds == null ? '-' : `${f.autoSeconds} s`, 'average time to an automatic decision'], [String(f.changedByArbitrator), 'changed by an arbitrator this week']]} />
      </Card>

      <Card>
        <H2>Message safety this week</H2><SampleTag on={f.sample} />
        <Figs id="safety" rows={[[fmt(f.checked), 'messages checked'], [`${fmt(f.blocked)} (${(f.checked ? (f.blocked / f.checked) * 100 : 0).toFixed(1)}%)`, 'messages blocked'],
          [fmt(f.help), 'times Help was shown after crisis words'], [fmt(f.held), 'messages held for a re-check']]} />
        <H3>Blocked messages by reason</H3><Bars rows={f.blockedBy} label="Blocked messages by reason" />
      </Card>

      <Card>
        <H2>Reports this week</H2><SampleTag on={f.sample} />
        <Bars rows={f.reports} label="Reports by reason" id="reports" />
      </Card>

      <Card>
        <H2>Blocking and actions</H2><SampleTag on={f.sample} />
        <Figs rows={[[fmt(f.blocksWeek), 'blocks this week'], [String(f.muted), 'members muted'], [String(f.suspended), 'members paused'], [String(f.ageChecks), 'waiting to confirm their age']]} />
        <H3>Most-blocked members</H3>
        {f.topBlocked.length ? (
          <View style={{ gap: 6 }} id="top-blocked">
            {f.topBlocked.map(([u, b, r]) => (
              <View key={u} style={ui.line}><Text style={[ui.p, { fontFamily: F.bold }]}>{u}</Text><Text style={[ui.p, ui.small]}>blocked by {b} · {r} reports</Text></View>))}
          </View>) : <P small muted>Nobody yet.</P>}
      </Card>

      <Card>
        <H2>Country of origin</H2><SampleTag on={f.sample} />
        <Bars rows={f.countries} label="Members by country" id="countries" />
        <P hint>Based on the country members choose on the Support page. User doesn't track location.</P>
      </Card>

      <Card>
        <H2>Peer support</H2><SampleTag on={f.sample} />
        <Figs rows={[[fmt(f.peers), 'active peer supporters'], [fmt(f.wantPeers), 'members who want peer support'], [fmt(f.peerChats), 'chats started with a peer supporter this week']]} />
      </Card>

      <Card>
        <H2>Rooms and system health</H2><SampleTag on={f.sample} />
        <Figs id="health" rows={[[String(f.rooms), 'rooms'], [String(f.roomsApproved), 'room requests approved this week'], [String(f.roomsRefused), 'room requests refused this week'],
          [String(f.overdue), 'reviews overdue'], [String(f.missed), 'missed by the first check, found by the nightly re-check']]} />
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  figs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fig: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineSoft, borderRadius: R.md, padding: 12, gap: 2 },
  figV: { fontFamily: F.display, fontSize: 22, color: C.ink },
  figK: { fontFamily: F.body, fontSize: 13, color: C.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.sage },
  case: { borderWidth: 1, borderColor: C.lineSoft, borderRadius: R.md, padding: 12, gap: 4 },
  urgent: { borderColor: C.dangerLine, backgroundColor: C.dangerSoft },
  amber: { backgroundColor: C.hlSoft, color: C.hlInk },
  red: { backgroundColor: C.danger, color: '#fff' },
});
