// Rooms: one type at a time, Your rooms, requesting a new room, and a room's posts.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { backend, Msg, Room, RoomRequest } from '../backend';
import { PATHS, PathKey } from '../data/reference';
import { roomRequestError } from '../lib/rooms';
import { CRISIS, notAllowed } from '../lib/safety';
import { useApp } from '../state/app';
import { SwipeRow } from '../components/Swipe';
import { B, Btn, Card, ErrorText, H2, H3, Label, P, Row, Select, s as ui } from '../components/ui';
import { C, F, R } from '../theme';
import { Bubble, Composer, NotSent, Sys } from './Chats';
import { HelpSheet } from './HelpSheet';
import { choiceName, GROUP_COLOUR, PathTiles } from './people';

const oops = 'Something went wrong reaching User. Check your connection and try again.';

function RoomRow({ r }: { r: Room }) {
  const g = PATHS.find(p => p.key === r.cat)!;
  return (
    <View testID="room" style={{ gap: 4, padding: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.frame, borderRadius: R.md }}>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden', backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderLeftWidth: 5, borderLeftColor: GROUP_COLOUR[g.g] }}>{choiceName(g.key)}</Text>
        <Text style={[ui.p, ui.b, { fontSize: 15.5 }]}>{r.name}</Text>
        {r.joined ? <Text style={{ fontFamily: F.bold, fontSize: 11.5, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: C.accentSoft, color: C.accentStrong, overflow: 'hidden' }}>Joined</Text> : null}
      </Row>
      <Text style={[ui.hint, { fontSize: 13 }]}>{r.desc}</Text>
      <Text style={[ui.hint, { fontSize: 13 }]}>{r.members} members</Text>
    </View>
  );
}

export function Rooms() {
  const { roomCat, setRoomCat, setView, toast, openSheet, chatsVer, chatsChanged } = useApp();
  const [rooms, setRooms] = useState<Room[] | null>(null); const [requests, setRequests] = useState<RoomRequest[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([backend.rooms(), backend.roomRequests()]).then(([r, q]) => { if (live) { setRooms(r); setRequests(q); } }).catch(() => { if (live) { setRooms([]); toast(oops); } });
    return () => { live = false; };
  }, [chatsVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = rooms || [], mine = all.filter(r => r.joined), g = PATHS.find(p => p.key === roomCat)!;
  const leave = async (r: Room) => {
    let undo: () => Promise<void>;
    try { undo = await backend.leaveRoom(r.id); } catch { toast(oops); return; }
    chatsChanged(); toast(r.mine ? `Room ${r.name} deleted.` : `You left ${r.name}.`, async () => { await undo(); chatsChanged(); });
  };
  return (
    <>
      <View style={{ gap: 4 }}><H2>Rooms</H2><P small muted>Small group chats in three choices. Every message is checked for safety.</P></View>
      <View style={{ gap: 10 }}>
        <Label>Choose a type of room</Label>
        <PathTiles label="Room types" idPrefix="roomtype" on={[roomCat]} foot={k => `${all.filter(r => r.cat === k).length} rooms`} onPress={setRoomCat} />
      </View>
      <View style={{ gap: 10 }} id="room-list">
        <Row style={{ gap: 8 }}><View style={{ width: 18, height: 18, borderWidth: 2, borderColor: C.frame, backgroundColor: GROUP_COLOUR[g.g] }} /><Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{choiceName(g.key)} rooms</Text></Row>
        {rooms === null ? <P muted>Loading rooms…</P> : all.filter(r => r.cat === roomCat).map(r => (
          <Pressable key={r.id} role="button" aria-label={r.name} onPress={() => setView({ name: 'room', id: r.id, title: r.name })}><RoomRow r={r} /></Pressable>
        ))}
      </View>
      <View style={{ gap: 10 }} id="your-rooms">
        <Label>Your rooms</Label>
        {mine.length ? <>
          {mine.map(r => (
            <SwipeRow key={r.id} action={r.mine ? 'Delete' : 'Leave'} label={`${r.mine ? 'Delete' : 'Leave'} ${r.name}`} rowLabel={r.name} onAction={() => leave(r)} onPress={() => setView({ name: 'room', id: r.id, title: r.name })}>
              <RoomRow r={r} />
            </SwipeRow>
          ))}
          <P hint>Swipe a room to the left to leave it. Rooms you created can be deleted.</P>
        </> : <P small muted>You haven't joined any rooms yet.</P>}
      </View>
      <Card>
        <H3>Start a new room</H3>
        <P small muted>Can't find the room you need? Suggest one.</P>
        <Btn variant="primary" style={{ alignSelf: 'flex-start' }} label="Request a new room" onPress={() => openSheet(<RequestRoom rooms={all} requests={requests} />)} />
        {requests.length ? (
          <View style={{ gap: 8 }} aria-label="Your room requests" id="requests">
            {requests.map(q => (
              <View key={q.id} style={ui.line}>
                <Text style={[ui.p, ui.small]}><B>{q.name}</B> · {choiceName(q.cat)}</Text>
                <Text style={[ui.pill, q.status !== 'Approved' && { backgroundColor: C.accentSoft, color: C.accentStrong }]}>{q.status}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </>
  );
}

function RequestRoom({ rooms, requests }: { rooms: Room[]; requests: RoomRequest[] }) {
  const { roomCat, closeSheet, chatsChanged } = useApp();
  const [name, setName] = useState(''); const [cat, setCat] = useState<PathKey>(roomCat); const [desc, setDesc] = useState('');
  const [err, setErr] = useState(''); const [sent, setSent] = useState<string | null>(null); const [done, setDone] = useState(false);
  const send = async () => {
    const n = name.trim(), d = desc.trim();
    const e = roomRequestError(n, d, [...rooms.map(r => r.name), ...requests.map(q => q.name)]); if (e) return setErr(e);
    setErr(''); const r = await backend.requestRoom(n, cat, d);
    if (!r.ok) return setErr(r.error);
    setSent(n);
    setTimeout(() => { setDone(true); chatsChanged(); }, 1500); // the check takes a moment
  };
  if (sent) return (
    <>
      <View role="status" style={{ alignItems: 'center', gap: 8 }} id="request-sent">
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.peer, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 24, fontFamily: F.bold }}>✓</Text></View>
        <H2>Request sent successfully</H2>
        <P>Your request for <B>{sent}</B> has been sent. We're checking it now.</P>
        <P small muted id="rq-status">{done ? 'Approved. The room has been created and you have joined it.' : 'Checking…'}</P>
      </View>
      <Btn variant="primary" label="Done" onPress={closeSheet} />
    </>
  );
  return (
    <>
      <H2>Request a new room</H2>
      <P small muted>Tell us what the room is for. We check it straight away and, if it's safe and new, create it for you.</P>
      <View style={ui.field}>
        <Text style={ui.fieldLabel}>Room name</Text>
        <TextInput id="rq-name" aria-label="Room name" maxLength={40} value={name} onChangeText={setName} placeholder="e.g. Cyclists in Recovery" placeholderTextColor={C.muted} style={ui.input} />
      </View>
      <Select label="Type of room" id="rq-cat" value={cat} options={PATHS.map(p => ({ id: p.key, label: choiceName(p.key) }))} onChange={v => setCat(v as PathKey)} />
      <View style={ui.field}>
        <Text style={ui.fieldLabel}>What is it for?</Text>
        <TextInput id="rq-desc" aria-label="What is it for?" multiline numberOfLines={3} maxLength={160} value={desc} onChangeText={setDesc} placeholder="One or two sentences" placeholderTextColor={C.muted} style={[ui.input, { minHeight: 70 }]} />
      </View>
      <ErrorText id="rq-err" text={err} />
      <Btn variant="primary" label="Send request" onPress={send} />
    </>
  );
}

export function RoomScreen({ id }: { id: string }) {
  const { openSheet, toast, chatsVer, chatsChanged } = useApp();
  const [room, setRoom] = useState<Room | null>(null); const [posts, setPosts] = useState<Msg[] | null>(null);
  const [warn, setWarn] = useState(false); const [draft, setDraft] = useState('');
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    let live = true;
    Promise.all([backend.rooms(), backend.roomPosts(id)]).then(([r, p]) => { if (live) { setRoom(r.find(x => x.id === id) || null); setPosts(p); } }).catch(() => { if (live) toast(oops); });
    return () => { live = false; };
  }, [id, chatsVer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 30); }, [posts?.length]);
  if (!room || !posts) return <View style={{ padding: 16 }}><P muted>Loading…</P></View>;
  const join = async () => {
    try { await backend.joinRoom(id); } catch { toast(oops); return; }
    setRoom({ ...room, joined: true, members: room.members + 1 }); chatsChanged(); toast("Joined. Say hello when you're ready.");
  };
  const post = async (t: string) => {
    if (notAllowed(t)) { setWarn(true); return false; }
    setWarn(false);
    const r = await backend.post(id, t); if (!r.ok) { toast(r.error); return false; }
    setPosts(l => [...(l || []), r.value]);
    if (CRISIS.test(t)) setTimeout(() => openSheet(<HelpSheet intro="It sounds like things might be really hard right now. These lines are open now." />), 400);
    return true;
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroller} id="msgs" style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Sys id="room-intro">{room.desc} Every message is checked for safety. {room.members} members.</Sys>
        {posts.map(m => <Bubble key={m.id} m={m} />)}
      </ScrollView>
      {warn ? <NotSent /> : null}
      {room.joined ? <Composer placeholder="Say something to the room" button="Post" onSend={post} text={draft} setText={setDraft} />
        : <View style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.lineSoft }}><Btn variant="primary" block label="Join room to post" onPress={join} /></View>}
    </View>
  );
}
