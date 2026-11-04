// Notifications on this device. Body: { action: 'key' } for the public key, { action: 'on', sub } to turn them on,
// { action: 'off', endpoint } to turn them off, { action: 'status', endpoint } to ask whether this device has them on,
// or { action: 'review', id } from the arbitrator after changing a decision.
import { admin, must, reply, serve } from '../_shared/db.ts';
import { notify, pushKeys } from '../_shared/push.ts';

serve(async (me, b) => {
  if (b.action === 'key') return reply({ ok: true, key: (await pushKeys()).public_key });
  if (b.action === 'on') {
    const sub = b.sub as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
    const endpoint = String(sub?.endpoint || ''), p256dh = String(sub?.keys?.p256dh || ''), auth = String(sub?.keys?.auth || '');
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return reply({ ok: false, error: 'bad subscription' }, 400);
    must(await admin.from('push_subs').upsert({ endpoint, member: me.id, p256dh, auth }, { onConflict: 'endpoint' }));
    return reply({ ok: true });
  }
  if (b.action === 'off') {
    must(await admin.from('push_subs').delete().eq('endpoint', String(b.endpoint || '')).eq('member', me.id));
    return reply({ ok: true });
  }
  if (b.action === 'status') {
    const row = must(await admin.from('push_subs').select('endpoint').eq('endpoint', String(b.endpoint || '')).eq('member', me.id).maybeSingle());
    return reply({ ok: true, on: !!row });
  }
  if (b.action === 'review') {
    const arb = must(await admin.from('arbitrators').select('member').eq('member', me.id).maybeSingle());
    if (!arb) return reply({ ok: false }, 403);
    const c = must(await admin.from('reviews').select('member').eq('id', String(b.id || '')).maybeSingle()) as { member: string } | null;
    if (c) await notify(c.member, 'review');
    return reply({ ok: true });
  }
  return reply({ ok: false, error: 'bad request' }, 400);
});
