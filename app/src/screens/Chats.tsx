// The Chats list, and a chat with one person.
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { backend, ChatSummary, Msg } from '../backend';
import { ICEBREAKERS } from '../data/community';
import { CRISIS, notAllowed } from '../lib/safety';
import { useApp } from '../state/app';
import { SwipeRow } from '../components/Swipe';
import { B, Btn, Card, H2, H3, Label, P, Row, s as ui } from '../components/ui';
import { C, F, R } from '../theme';
import { HelpSheet } from './HelpSheet';

export const timeAgo = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'now'; if (m < 60) return m + 'm';
  const h = Math.round(m / 60); if (h < 24) return h + 'h'; return Math.round(h / 24) + 'd';
};
const oops = 'Something went wrong reaching User. Check your connection and try again.';

export function Chats() {
  const { profile, setView, setTab, toast, chatsVer, chatsChanged } = useApp();
  const [list, setList] = useState<ChatSummary[] | null>(null); const [blocked, setBlocked] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([backend.chats(), backend.blocked()]).then(([c, b]) => { if (live) { setList(c); setBlocked(b); } }).catch(() => { if (live) { setList([]); toast(oops); } });
    return () => { live = false; };
  }, [chatsVer]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!profile) return null;
  const del = async (w: string) => {
    let undo: () => Promise<void>;
    try { undo = await backend.deleteChat(w); } catch { toast(oops); return; }
    chatsChanged(); toast(`Chat with ${w} deleted.`, async () => { await undo(); chatsChanged(); });
  };
  const unblock = async (u: string) => { await backend.unblock(u); chatsChanged(); toast(`${u} is unblocked.`); };
  return (
    <>
      <View style={{ gap: 4 }}>
        <H2>Chats</H2>
        <P small muted>Messages are private between you and the other person. {profile.prefs.disappearing ? 'Disappearing messages are on (7 days).' : ''}</P>
      </View>
      {list === null ? <P muted>Loading your chats…</P> : list.length ? (
        <View style={{ gap: 10 }} id="chat-list">
          {list.map(c => (
            <SwipeRow key={c.with} action="Delete" label={`Delete chat with ${c.with}`} rowLabel={`Chat with ${c.with}`} onAction={() => del(c.with)} onPress={() => setView({ name: 'chat', with: c.with })}>
              <View testID="chat" style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.frame, borderRadius: R.md }}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}><Text style={[ui.p, ui.b, { fontSize: 15.5 }]}>{c.with}</Text><Text style={[ui.hint, { fontSize: 13 }]}>{timeAgo(c.last.at)}</Text></Row>
                  <Text numberOfLines={1} style={[ui.p, ui.small, !c.unread && ui.muted]}>{c.last.mine ? 'You: ' : ''}{c.last.text}</Text>
                </View>
                {c.unread ? <Text style={{ fontFamily: F.bold, fontSize: 11.5, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: C.accentSoft, color: C.accentStrong, overflow: 'hidden' }}>New</Text> : null}
              </View>
            </SwipeRow>
          ))}
          <P hint>Swipe a chat to the left to delete it.</P>
        </View>
      ) : (
        <Card>
          <P>No chats yet. Find someone who shares an interest and say hi.</P>
          <Btn variant="primary" style={{ alignSelf: 'flex-start' }} label="Search for people" onPress={() => setTab('find')} />
        </Card>
      )}
      {blocked.length ? (
        <View style={{ gap: 10 }} id="chats-blocked">
          <Label>Blocked ({blocked.length})</Label>
          {blocked.map(u => (
            <View key={u} style={ui.line}>
              <Text style={ui.p}><B>{u}</B> <Text style={[ui.hint, { fontSize: 13 }]}>can't message you</Text></Text>
              <Btn sm label="Unblock" onPress={() => unblock(u)} />
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

export const Bubble = ({ m }: { m: Msg }) => (
  <View testID={m.mine ? 'mine' : 'theirs'} style={[{ maxWidth: '80%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18 },
    m.mine ? { alignSelf: 'flex-end', backgroundColor: C.accent, borderBottomRightRadius: 6 } : { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 6, boxShadow: '0 1px 2px rgba(10,30,61,.06), 0 4px 14px rgba(10,30,61,.07)' }]}>
    {m.who ? <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: C.muted, marginBottom: 2 }}>{m.who}</Text> : null}
    <Text style={{ fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: m.mine ? '#fff' : C.ink }}>{m.text}</Text>
  </View>
);
export const Sys = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <Text id={id} style={{ alignSelf: 'center', maxWidth: '92%', textAlign: 'center', fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.muted }}>{children}</Text>
);

// "Message not sent": shown when a message looks like dealing or off-app contact.
export function NotSent() {
  const { toast } = useApp();
  return (
    <View role="alert" id="warn" style={{ marginHorizontal: 12, padding: 12, borderRadius: R.md, backgroundColor: C.dangerSoft, gap: 6 }}>
      <Text style={{ fontFamily: F.bold, color: C.danger, fontSize: 13 }}>Message not sent</Text>
      <Text style={{ fontFamily: F.body, color: C.ink, fontSize: 13, lineHeight: 19 }}>It looks like it could be about buying or selling, or sharing links or other apps' contact details. User doesn't allow sourcing or off-app contact, to keep everyone safe. If you're struggling with cravings, the Help button has people to talk to right now.</Text>
      {/* The review form arrives with reviews in step 4. */}
      <Btn variant="quiet" sm label="Think this is wrong? Ask for a review" onPress={() => toast('Reviews open here.')} />
    </View>
  );
}

// The message box at the bottom of a chat or room.
export function Composer({ placeholder, button, onSend, text, setText }:
  { placeholder: string; button: string; onSend: (text: string) => Promise<boolean>; text: string; setText: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const t = text.trim(); if (!t || busy) return;
    setBusy(true); const ok = await onSend(t); setBusy(false);
    if (ok) setText('');
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.lineSoft }}>
      <TextInput id="msg" aria-label="Message" value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={C.muted} maxLength={1000}
        onSubmitEditing={send} submitBehavior="submit" autoComplete="off"
        style={[ui.input, { flex: 1, borderRadius: 999 }]} />
      <Btn variant="primary" label={button} onPress={send} disabled={busy} />
    </View>
  );
}

export function Chat({ withUser }: { withUser: string }) {
  const { profile, openSheet, toast, chatsVer, refreshUnread } = useApp();
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState<Msg[] | null>(null); const [warn, setWarn] = useState(false); const [typing, setTyping] = useState(false);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const here = useRef(true); useEffect(() => () => { here.current = false; }, []);
  useEffect(() => {
    let live = true;
    backend.messages(withUser).then(l => { if (live) { setMsgs(l); refreshUnread(); } }).catch(() => { if (live) { setMsgs([]); toast(oops); } });
    return () => { live = false; };
  }, [withUser, chatsVer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 30); }, [msgs?.length, typing]);
  if (!profile) return null;
  const week = Date.now() - 7 * 86400000;
  const shown = (msgs || []).filter(m => !profile.prefs.disappearing || m.at > week);

  const send = async (t: string) => {
    if (notAllowed(t)) { setWarn(true); return false; }
    setWarn(false);
    const r = await backend.send(withUser, t);
    if (!r.ok) { toast(r.error); return false; }
    setMsgs(l => [...(l || []), r.value]);
    if (CRISIS.test(t)) setTimeout(() => openSheet(<HelpSheet intro="It sounds like things might be really hard right now. If you're thinking about ending your life or someone may have overdosed, please reach out now." />), 400);
    // Sample members reply after a moment, with a typing indicator.
    setTimeout(() => { if (here.current) setTyping(true); }, 700);
    setTimeout(async () => {
      const reply = await backend.sampleReply(withUser).catch(() => null);
      if (!here.current) return; setTyping(false);
      if (reply) { setMsgs(l => (l && !l.some(m => m.id === reply.id) ? [...l, reply] : l)); await backend.messages(withUser).catch(() => null); refreshUnread(); }
    }, 2200 + Math.random() * 1200);
    return true;
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroller} id="msgs" style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Sys id="chat-intro">You're both anonymous, and every message is checked for safety. Never share your real name or address.</Sys>
        <Btn variant="quiet" sm label="Safety & options" onPress={() => openSheet(<ChatOptions withUser={withUser} />)} />
        {profile.prefs.disappearing ? <Sys>Disappearing messages are on. Messages are deleted 7 days after they are sent.</Sys> : null}
        {shown.map(m => <Bubble key={m.id} m={m} />)}
        {typing ? <Text id="typing" style={{ alignSelf: 'flex-start', color: C.muted, fontSize: 13, fontFamily: F.body, paddingVertical: 4, paddingHorizontal: 8 }}>{withUser} is typing…</Text> : null}
      </ScrollView>
      {warn ? <NotSent /> : null}
      {msgs && shown.length < 3 ? (
        <ScrollView horizontal aria-label="Conversation starters" id="starters" style={{ flexGrow: 0, backgroundColor: C.surface }} contentContainerStyle={{ gap: 6, paddingTop: 8, paddingHorizontal: 12 }}>
          {ICEBREAKERS.map(t => <Btn key={t} sm label={t} onPress={() => setDraft(t)} />)}
        </ScrollView>
      ) : null}
      <Composer placeholder={`Message ${withUser}`} button="Send" onSend={send} text={draft} setText={setDraft} />
    </View>
  );
}

function ChatOptions({ withUser }: { withUser: string }) {
  const { toast, closeSheet, setView, membersChanged } = useApp();
  const block = async () => {
    try { await backend.block(withUser); } catch { toast(oops); return; }
    closeSheet(); setView(null); membersChanged(); toast(`${withUser} is blocked. They can't see or message you.`);
  };
  return (
    <>
      <H2>{withUser}</H2>
      <Card tone="calm"><H3>Meeting up safely</H3><P small>Meet in a busy public place in daylight, like a park entrance or café. Tell a friend where you'll be. Don't share your home address. Never use substances with someone you've just met. You can leave at any time.</P></Card>
      <View style={{ gap: 8 }}>
        <View style={ui.line}><Text style={ui.p}>Mute notifications</Text><Btn sm label="Mute" onPress={() => toast('Muted for 8 hours.')} /></View>
        {/* Reports arrive in step 4. */}
        <View style={ui.line}><Text style={ui.p}>Report a message or behaviour</Text><Btn sm label="Report" onPress={() => toast('Reporting opens here.')} /></View>
        <View style={ui.line}><Text style={ui.p}>Block {withUser}</Text><Btn sm variant="danger" label="Block" onPress={block} /></View>
      </View>
    </>
  );
}
