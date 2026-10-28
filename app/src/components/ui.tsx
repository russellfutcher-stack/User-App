// Building blocks that copy the prototype's look: cards, buttons, chips, toggles and fields.
import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { C, F, R, soft } from '../theme';

// Gradients: React Native and the web read different style names.
export const gradient = (css: string) => (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;

export const Card = ({ children, tone, style }: { children: ReactNode; tone?: 'calm' | 'warm'; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.card, tone === 'calm' && { backgroundColor: C.sageSoft, borderColor: 'transparent' }, tone === 'warm' && { backgroundColor: C.accentSoft, borderColor: 'transparent' }, style]}>{children}</View>
);
export const Section = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.section, style]}>{children}</View>;
export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.row, style]}>{children}</View>;

export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text role="heading" aria-level={1} style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text role="heading" aria-level={2} style={[s.h2, style]}>{children}</Text>;
export const H3 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text role="heading" aria-level={3} style={[s.h3, style]}>{children}</Text>;
export const P = ({ children, muted, small, hint, bold, style, id }: { children: ReactNode; muted?: boolean; small?: boolean; hint?: boolean; bold?: boolean; style?: StyleProp<TextStyle>; id?: string }) => (
  <Text id={id} style={[s.p, small && s.small, muted && s.muted, hint && s.hint, bold && s.b, style]}>{children}</Text>
);
export const B = ({ children }: { children: ReactNode }) => <Text style={s.b}>{children}</Text>;
export const Label = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.label, style]}>{children}</Text>;
export const ErrorText = ({ text, id }: { text: string; id: string }) => <Text id={id} role="alert" style={s.hint}>{text}</Text>;

type BtnProps = { label: string; onPress: () => void; variant?: 'primary' | 'danger' | 'quiet'; sm?: boolean; block?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; id?: string };
export function Btn({ label, onPress, variant, sm, block, disabled, style, id }: BtnProps) {
  return (
    <Pressable id={id} role="button" aria-label={label} disabled={disabled} onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.btn, sm && s.btnSm, block && { alignSelf: 'stretch' },
        variant === 'primary' && s.btnPrimary, variant === 'danger' && s.btnDanger, variant === 'quiet' && s.btnQuiet,
        hovered && !variant && { backgroundColor: C.accentSoft }, hovered && variant === 'primary' && { backgroundColor: C.accentStrong },
        pressed && { transform: [{ translateY: 1 }] }, disabled && { opacity: 0.5 }, style]}>
      <Text style={[s.btnText, sm && { fontSize: 13 }, variant === 'primary' && { color: '#fff' }, variant === 'danger' && { color: C.danger },
        variant === 'quiet' && { color: C.muted, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  );
}

export const Pill = ({ text, peer, id }: { text: string; peer?: boolean; id?: string }) => (
  <Text id={id} style={[s.pill, peer && { backgroundColor: C.peerSoft, color: C.peer }]}>{text}</Text>
);

export const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable role="checkbox" aria-checked={on} aria-label={label} onPress={onPress}
    style={[s.chip, on && { backgroundColor: C.hl, borderColor: C.hlLine }]}>
    <Text style={[s.chipText, on && { color: C.hlInk }]}>{on ? '✓ ' : ''}{label}</Text>
  </Pressable>
);
export const Chips = ({ children, label }: { children: ReactNode; label?: string }) => <View role="group" aria-label={label} style={s.chips}>{children}</View>;

// An on/off switch with a label and an optional line of help underneath.
export function Toggle({ label, hint, value, onChange, id }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <Pressable id={id} role="switch" aria-checked={value} aria-label={label} onPress={() => onChange(!value)} style={s.toggle}>
      <View style={{ flex: 1 }}><Text style={s.p}>{label}</Text>{hint ? <Text style={[s.hint, { marginTop: 2 }]}>{hint}</Text> : null}</View>
      <View style={[s.track, value && { backgroundColor: C.accent, borderColor: C.accent }]}><View style={[s.knob, value && { transform: [{ translateX: 18 }] }]} /></View>
    </Pressable>
  );
}

export function Check({ label, value, onChange, id }: { label: string; value: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <Pressable id={id} role="checkbox" aria-checked={value} aria-label={label} onPress={() => onChange(!value)} style={s.line}>
      <Text style={[s.p, { flex: 1 }]}>{label}</Text>
      <View style={[s.box, value && { backgroundColor: C.accent, borderColor: C.accent }]}>{value ? <Text style={s.tick}>✓</Text> : null}</View>
    </Pressable>
  );
}

export function Radio({ label, on, onPress, value, name }: { label: string; on: boolean; onPress: () => void; value: string; name: string }) {
  return (
    <Pressable role="radio" aria-checked={on} aria-label={label} id={`${name}-${value}`} onPress={onPress} style={s.radio}>
      <View style={[s.dot, on && { borderColor: C.accent }]}>{on ? <View style={s.dotIn} /> : null}</View>
      <Text style={s.p}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, id, hint, right, ...input }: TextInputProps & { label: string; id: string; hint?: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.row}>
        <TextInput id={id} aria-label={label} placeholderTextColor="#7A8DA6" {...input}
          style={[s.input, input.multiline && { minHeight: 72, textAlignVertical: 'top' }, { flex: 1 }]} />
        {right}
      </View>
      {typeof hint === 'string' ? <Text style={s.hint}>{hint}</Text> : hint}
    </View>
  );
}

// A drop-down list. On the web it is the browser's own list; phones get the same later.
export function Select({ label, id, value, options, onChange }: { label: string; id: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {Platform.OS === 'web'
        ? React.createElement('select', {
            id, 'aria-label': label, value, onChange: (e: { target: { value: string } }) => onChange(e.target.value),
            style: { border: `1px solid ${C.line}`, borderRadius: R.sm, padding: '11px 12px', fontFamily: F.body, fontSize: 15, color: C.ink, background: C.surface, width: '100%' },
          }, options.map(o => React.createElement('option', { key: o.id, value: o.id }, o.label)))
        : <Pressable id={id} role="button" aria-label={label} style={s.input}
            onPress={() => { const i = options.findIndex(o => o.id === value); onChange(options[(i + 1) % options.length].id); }}>
            <Text style={s.p}>{options.find(o => o.id === value)?.label}</Text>
          </Pressable>}
    </View>
  );
}

export const Steps = ({ n, of }: { n: number; of: number }) => (
  <View style={s.steps} aria-label={`Step ${n} of ${of}`} id="steps">
    {Array.from({ length: of }, (_, i) => <View key={i} style={[s.step, i < n && { backgroundColor: C.accent }]} testID={i < n ? 'step-on' : 'step'} />)}
  </View>
);

export const Meter = ({ pct }: { pct: number }) => (
  <View style={s.meter}><View id="pm" style={{ width: `${pct}%`, height: '100%', backgroundColor: C.sage }} /></View>
);

export const Bullet = ({ children }: { children: ReactNode }) => <Text style={[s.p, s.small]}>• {children}</Text>;

export const Disclaimer = () => <Text style={[s.hint, { textAlign: 'center', fontSize: 13 }]}>User is peer support, not a medical or emergency service.</Text>;

export const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineSoft, borderRadius: R.lg, padding: 16, gap: 12, ...soft },
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1: { fontFamily: F.display, fontSize: 32, lineHeight: 34, color: C.ink, letterSpacing: -0.6 },
  h2: { fontFamily: F.displayBold, fontSize: 21, lineHeight: 24, color: C.ink, letterSpacing: -0.2 },
  h3: { fontFamily: F.displayBold, fontSize: 16, color: C.ink },
  p: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.ink },
  b: { fontFamily: F.bold },
  small: { fontSize: 13, lineHeight: 19 },
  muted: { color: C.muted },
  hint: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.muted },
  label: { fontFamily: F.bold, fontSize: 11.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted },
  btn: { borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.surface, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', ...soft },
  btnSm: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 },
  btnPrimary: { backgroundColor: C.accent, borderColor: 'transparent', paddingVertical: 12, paddingHorizontal: 16, boxShadow: '0 2px 6px rgba(13,59,122,.3)', ...gradient('linear-gradient(180deg,#1A4E96,#0D3B7A)') },
  btnDanger: { backgroundColor: C.dangerSoft, borderColor: C.dangerLine, boxShadow: 'none' },
  btnQuiet: { backgroundColor: 'transparent', borderColor: 'transparent', boxShadow: 'none', alignSelf: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 14.5, color: C.ink, textAlign: 'center' },
  pill: { fontFamily: F.bold, fontSize: 11.5, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: C.sageSoft, color: C.sage, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  chipText: { fontFamily: F.bold, fontSize: 13, lineHeight: 17, color: C.ink },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  track: { width: 42, height: 24, borderRadius: 12, backgroundColor: C.lineSoft, borderWidth: 1, borderColor: C.line, padding: 2 },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: C.surface2 },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#fff', fontFamily: F.bold, fontSize: 13, lineHeight: 15 },
  radio: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.lineSoft, borderRadius: R.sm },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent },
  field: { gap: 6 },
  fieldLabel: { fontFamily: F.bold, fontSize: 13.5, color: C.ink },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: C.surface, fontFamily: F.body, fontSize: 15, color: C.ink },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 4, borderRadius: 4, backgroundColor: C.line },
  meter: { height: 6, borderRadius: 6, backgroundColor: C.line, overflow: 'hidden' },
});
