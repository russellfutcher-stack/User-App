// Tab icons, copied from the prototype.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Tab } from '../state/app';

const P = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
export function TabIcon({ name, color }: { name: Tab; color: string }) {
  const p = { ...P, stroke: color };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'find' && <><Circle {...p} cx={11} cy={11} r={7} /><Path {...p} d="M20 20l-3.5-3.5" /></>}
      {name === 'chat' && <Path {...p} d="M4 5h16v11H9l-5 4z" />}
      {name === 'rooms' && <><Circle {...p} cx={8} cy={9} r={3} /><Circle {...p} cx={16.5} cy={9} r={3} /><Path {...p} d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M12 15.2c1.2-.5 2.8-.7 4.5-.7 2.5 0 4.7 1.5 5.5 4.5" /></>}
      {name === 'support' && <><Path {...p} d="M12 21s-7.5-4.6-9.3-9.4C1.4 8 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.8 1.4-1.7 2.8-2.8 4.8-2.8 3.6 0 5.8 3.5 4.5 7.1C19.5 16.4 12 21 12 21z" /><Path {...p} d="M8.5 12.5h2l1.2-2.5 1.6 4 1.2-1.5h1.5" /></>}
      {name === 'me' && <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></>}
    </Svg>
  );
}
