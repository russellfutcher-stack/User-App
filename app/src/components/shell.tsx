// The header (brand or Back, Exit, Help now), the tab bar, the bottom sheet and the toast.
import React, { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Tab } from '../state/app';
import { C, F, R } from '../theme';
import { TabIcon } from './icons';
import { gradient } from './ui';
import { HelpSheet } from '../screens/HelpSheet';

export function Bar({ back, title }: { back?: () => void; title?: string }) {
  const { exit, openSheet } = useApp();
  const top = useSafeAreaInsets().top;
  return (
    <View style={[s.bar, { paddingTop: 14 + top }]} id="bar">
      {back ? <Pressable role="button" aria-label="Back" onPress={back} style={s.iconbtn}><Text style={s.iconText}>Back</Text></Pressable>
        : title === undefined ? <View><Text style={s.brand}>User</Text><Text style={s.brandSmall}>CONNECTION AND RECOVERY</Text></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>{title ? <Text numberOfLines={1} style={s.title}>{title}</Text> : null}</View>
      <Pressable role="button" aria-label="Quick exit: hide the app" onPress={exit} style={s.iconbtn}><Text style={s.iconText}>Exit</Text></Pressable>
      <Pressable role="button" aria-label="Help now" onPress={() => openSheet(<HelpSheet />)} style={[s.iconbtn, { backgroundColor: C.danger }]}><Text style={[s.iconText, { color: '#fff' }]}>Help now</Text></Pressable>
    </View>
  );
}

const TABS: [Tab, string][] = [['home', 'Home'], ['me', 'Me'], ['find', 'Search'], ['chat', 'Chats'], ['rooms', 'Rooms'], ['support', 'Support']];
export function Tabs() {
  const { tab, setTab, unread } = useApp();
  const bottom = useSafeAreaInsets().bottom;
  return (
    <View role="navigation" aria-label="Main" id="tabs" style={[s.tabs, { paddingBottom: bottom }]}>
      {TABS.map(([k, l]) => {
        const on = tab === k;
        return (
          <Pressable key={k} role="tab" aria-selected={on} aria-label={l} onPress={() => setTab(k)} style={s.tab}>
            <View style={[s.tabIc, on && { backgroundColor: C.hl }]}><TabIcon name={k} color={on ? C.hlInk : C.muted} /></View>
            <Text style={[s.tabText, on && { color: C.ink, fontFamily: F.bold }]}>{l}</Text>
            {k === 'chat' && unread ? <View aria-label="unread" id="unread-dot" style={{ position: 'absolute', top: 6, right: '28%', width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SheetHost() {
  const { sheet, closeSheet } = useApp();
  if (!sheet) return null;
  return (
    <View style={s.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} aria-label="Close" role="button" testID="scrim" />
      <View style={s.sheet} role="dialog" id="sheet">
        <View style={s.grab} />
        <ScrollView contentContainerStyle={{ gap: 14 }}>{sheet}</ScrollView>
      </View>
    </View>
  );
}

export function ToastHost() {
  const { toastMsg, toast } = useApp();
  if (!toastMsg) return null;
  const { undo } = toastMsg;
  return (
    <View style={s.toast} pointerEvents="box-none">
      <View key={toastMsg.n} role="status" id="toast" style={[s.toastBox, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Text style={s.toastText}>{toastMsg.text}</Text>
        {undo ? <Pressable role="button" aria-label="Undo" onPress={() => { toast(''); undo(); }}><Text style={[s.toastText, { color: C.hl, fontFamily: F.bold }]}>Undo</Text></Pressable> : null}
      </View>
    </View>
  );
}

export const SheetBody = ({ children }: { children: ReactNode }) => <View style={{ gap: 14 }}>{children}</View>;

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, zIndex: 25, ...gradient('linear-gradient(90deg,#0A2A5E,#4E9FE0)'), backgroundColor: C.gradA },
  brand: { fontFamily: F.display, fontSize: 22, lineHeight: 22, color: '#fff', letterSpacing: -0.4 },
  brandSmall: { fontFamily: F.body, fontSize: 11, letterSpacing: 0.7, color: '#fff', opacity: 0.85, marginTop: 3 },
  title: { fontFamily: F.displayBold, fontSize: 18, color: '#fff' },
  iconbtn: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,.92)', paddingVertical: 7, paddingHorizontal: 12 },
  iconText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.lineSoft },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 9, paddingBottom: 10 },
  tabIc: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 14 },
  tabText: { fontFamily: F.body, fontSize: 10.5, color: C.muted },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,16,22,.45)', justifyContent: 'flex-end', zIndex: 20 },
  sheet: { backgroundColor: C.surface, maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingTop: 18, paddingBottom: 18, gap: 14, boxShadow: '0 -10px 40px rgba(10,30,61,.18)' },
  grab: { width: 42, height: 5, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center' },
  toast: { position: 'absolute', left: 0, right: 0, bottom: 84, alignItems: 'center', zIndex: 30 },
  toastBox: { backgroundColor: C.ink, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.md, maxWidth: '86%' },
  toastText: { color: C.surface, fontFamily: F.body, fontSize: 13.5, textAlign: 'center', flexShrink: 1 },
});
