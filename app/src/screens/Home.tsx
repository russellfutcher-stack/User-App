import React from 'react';
import { useApp } from '../state/app';
import { Card, H2, P } from '../components/ui';

// Home, Search, Chats, Rooms and Support are built in steps 2 to 5 of the build plan.
export function Home() {
  const { profile } = useApp();
  return <Card><H2>Welcome back, {profile?.username}</H2><P muted>Your matches will show here.</P></Card>;
}
export function Later({ name }: { name: string }) {
  return <Card><H2>{name}</H2><P muted>Coming in a later build step.</P></Card>;
}
