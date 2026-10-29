// Reporting a member, and asking for a review. Copied from the prototype (App.report, App.humanReview, App.sendReview).
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { backend, Review } from '../backend';
import { REPORT_REASONS, REVIEW_TOPICS } from '../lib/review';
import { useApp } from '../state/app';
import { B, Btn, ErrorText, H2, P, Select, s as ui } from '../components/ui';
import { C, F } from '../theme';

export function ReportSheet({ username }: { username: string }) {
  const { closeSheet, openSheet, toast } = useApp();
  const send = async (reason: string) => {
    const r = await backend.report(username, reason);
    closeSheet();
    if (!r.ok) { toast(r.error); return; }
    toast(r.value.urgent ? 'Report sent. Because this may be serious, it is being reviewed urgently.' : "Report sent. We're reviewing it now.");
  };
  return (
    <>
      <H2>Report {username}</H2>
      <P small muted>Reports are anonymous and are reviewed straight away. An independent arbitrator checks decisions and can change them.</P>
      <View style={{ gap: 8 }} id="report-reasons">
        {REPORT_REASONS.map(r => <Btn key={r} label={r} style={{ alignItems: 'flex-start' }} onPress={() => send(r)} />)}
      </View>
      <Btn variant="quiet" sm label="Think a decision is wrong? Ask for a review" onPress={() => openSheet(<ReviewSheet topic="A report I made" />)} />
    </>
  );
}

export function ReviewSheet({ topic: start }: { topic?: string }) {
  const { closeSheet, setTab } = useApp();
  const [topic, setTopic] = useState<string>(start || REVIEW_TOPICS[0]); const [text, setText] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState<Review | null>(null);
  const live = useRef(true); useEffect(() => () => { live.current = false; }, []);
  const send = async () => {
    const t = text.trim(); if (t.length < 10) return setErr('Please describe what happened in at least 10 characters.');
    if (busy) return; setErr(''); setBusy(true);
    const r = await backend.requestReview(topic, t); setBusy(false);
    if (!r.ok) return setErr(r.error);
    setSent(r.value);
    // Every review is decided straight away; show the decision as soon as it's there.
    for (let i = 0; i < 40 && live.current; i++) {
      await new Promise(res => setTimeout(res, i < 5 ? 800 : 1500));
      const c = (await backend.reviews().catch(() => [])).find(x => x.id === r.value.id);
      if (c && c.note) { if (live.current) setSent(c); return; }
    }
  };
  if (sent) return (
    <>
      <View role="status" style={{ alignItems: 'center', gap: 8 }} id="review-sent">
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.peer, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 24, fontFamily: F.bold }}>✓</Text></View>
        <H2>Review requested</H2>
        <P>Your review <B>{sent.id}</B> has been sent and is being checked now.</P>
        <P small muted id="rv-status">{sent.note || 'Checking…'}</P>
      </View>
      <Btn variant="primary" label="Done" onPress={() => { closeSheet(); setTab('support'); }} />
    </>
  );
  return (
    <>
      <H2>Ask for a review</H2>
      <P small muted>Every review is decided straight away. An independent arbitrator checks decisions and can change them. Reviews are confidential.</P>
      <Select label="What is it about?" id="hr-topic" value={topic} options={REVIEW_TOPICS.map(t => ({ id: t, label: t }))} onChange={setTopic} />
      <View style={ui.field}>
        <Text style={ui.fieldLabel}>What happened?</Text>
        <TextInput id="hr-text" aria-label="What happened?" multiline numberOfLines={4} maxLength={500} value={text} onChangeText={setText}
          placeholder="Tell the arbitrator what happened and what you'd like them to look at." placeholderTextColor={C.muted} style={[ui.input, { minHeight: 90 }]} />
      </View>
      <ErrorText id="hr-err" text={err} />
      <Btn variant="primary" label="Request a review" onPress={send} disabled={busy} />
    </>
  );
}
