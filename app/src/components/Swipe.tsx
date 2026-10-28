// Swipe a row to the left to show a red action button behind it (Delete or Leave). Works with a finger or a mouse.
// A short swipe snaps back, a swipe never counts as a tap, and tapping an open row just closes it.
import React, { ReactNode, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { C, F, R } from '../theme';

const OPEN = -96, MIN = -60;

export function SwipeRow({ action, label, onAction, onPress, rowLabel, children }:
  { action: string; label: string; onAction: () => void; onPress: () => void; rowLabel: string; children: ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false), swiped = useRef(false);
  const set = (o: boolean) => { open.current = o; Animated.timing(x, { toValue: o ? OPEN : 0, duration: 180, useNativeDriver: false }).start(); };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { swiped.current = true; },
    onPanResponderMove: (_, g) => x.setValue(Math.max(-120, Math.min(0, (open.current ? OPEN : 0) + g.dx))),
    onPanResponderRelease: (_, g) => { set((open.current ? OPEN : 0) + g.dx < MIN); setTimeout(() => { swiped.current = false; }, 60); },
    onPanResponderTerminate: () => { set(open.current); swiped.current = false; },
  })).current;
  return (
    <View testID="swipe" style={{ position: 'relative', overflow: 'hidden', borderRadius: R.md }}>
      <Pressable role="button" aria-label={label} onPress={onAction}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 96, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 14.5 }}>{action}</Text>
      </Pressable>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: C.surface2 }}>
        <Pressable role="button" aria-label={rowLabel} testID="swipe-row" onPress={() => { if (swiped.current) return; if (open.current) set(false); else onPress(); }}
          style={{ userSelect: 'none' } as object}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
