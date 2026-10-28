import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/app';

// Quick exit: the app is replaced by a plain note. Tap the note three times to return.
export function QuickExit() {
  const { unexit } = useApp();
  const serif = { fontFamily: 'Georgia, serif', color: '#222' };
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
        <Text style={[serif, { fontSize: 22 }]}>Notes</Text>
      </View>
      <Pressable onPress={unexit} style={{ flex: 1, padding: 24 }} testID="fake-note">
        <Text style={[serif, { fontSize: 22, marginBottom: 12, fontWeight: '700' }]}>Shopping list</Text>
        {['Milk', 'Bread', 'Dog food', 'Batteries (AA)', 'Call about boiler'].map(i => <Text key={i} style={[serif, { fontSize: 15, marginVertical: 6 }]}>•  {i}</Text>)}
        <Text style={{ color: '#999', fontSize: 12, marginTop: 40, fontFamily: 'Georgia, serif' }}>Tap this note three times to return.</Text>
      </Pressable>
    </View>
  );
}
