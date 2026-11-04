// Notifications (Web Push). They never carry names or message text, only a neutral line, so nobody looking at a phone
// learns anything (Rusty, 4 Nov 2026). The signing keys are made here the first time and kept in public.push_keys.
import webpush from 'npm:web-push@3.6.7';
import { admin, must } from './db.ts';

export const TEXT = { message: 'You have a new message.', review: 'A review has been decided.' } as const;

let keys: { public_key: string; private_key: string } | null = null;
export async function pushKeys() {
  if (keys) return keys;
  keys = must(await admin.from('push_keys').select('public_key, private_key').eq('id', 1).maybeSingle()) as typeof keys;
  if (!keys) {
    const k = webpush.generateVAPIDKeys();
    // If two requests race, the first key wins and both read it back.
    await admin.from('push_keys').upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true });
    keys = must(await admin.from('push_keys').select('public_key, private_key').eq('id', 1).single()) as typeof keys;
  }
  return keys!;
}

// Sends a notification to every device the member turned it on for. Devices that have gone away are forgotten.
export async function notify(member: string, kind: keyof typeof TEXT) {
  const subs = must(await admin.from('push_subs').select('endpoint, p256dh, auth').eq('member', member)) as { endpoint: string; p256dh: string; auth: string }[];
  if (!subs.length) return 0;
  const k = await pushKeys();
  webpush.setVapidDetails('https://russellfutcher-stack.github.io/User-App/', k.public_key, k.private_key);
  const body = JSON.stringify({ title: 'User', body: TEXT[kind], tag: kind });
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600, urgency: 'normal' }); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from('push_subs').delete().eq('endpoint', s.endpoint);
      else console.error('push failed', code);
    }
  }));
  return sent;
}
