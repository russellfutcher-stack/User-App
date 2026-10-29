// The nightly re-check (AI-agents-spec.md, section 5.4). Started once a night by pg_cron (public.run_job), never by members.
// 1. Collects the answers to earlier batches: a delivered message the careful check would have blocked, or that needed
//    the Help sheet, is a miss. Misses are logged (moderation, kind 'recheck', with the text unless the chat has disappearing messages on)
//    for the arbitrator and the test set.
// 2. Sends a new batch: a random sample of the last day's delivered messages and posts, checked by Claude Opus 5.5 at
//    medium effort through the Batch API, at about half the normal price. Answers come back within a day.
import { CAREFUL, client, MESSAGE_SCHEMA, MessageCheck, quote } from '../_shared/claude.ts';
import { admin, must, reply } from '../_shared/db.ts';
import { POLICY } from '../_shared/policy.ts';
import { CRISIS } from '../_shared/safety.ts';

const SAMPLE = 100; // messages a night: roughly $0.30 at batch prices (an estimate, to be measured)
type Item = { id: string; kind: 'message' | 'post'; ref: number }; // only ids are kept: the text stays where it is, so disappearing messages still disappear

async function collect() {
  const open = must(await admin.from('rechecks').select('id, batch_id, items').is('collected_at', null)) as { id: number; batch_id: string; items: Item[] }[];
  let done = 0;
  for (const b of open) {
    const batch = await client.messages.batches.retrieve(b.batch_id);
    if (batch.processing_status !== 'ended') continue;
    const items = new Map(b.items.map(i => [i.id, i]));
    let checked = 0, missed = 0;
    for await (const r of await client.messages.batches.results(b.batch_id)) {
      const item = items.get(r.custom_id); if (!item || r.result.type !== 'succeeded') continue;
      const [found] = must(await admin.rpc('recheck_body', { k: item.kind, r: item.ref })) as { body: string; keep: boolean }[];
      if (!found) continue; // deleted since
      const msg = r.result.message; if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') continue;
      let v: MessageCheck;
      // deno-lint-ignore no-explicit-any
      try { v = JSON.parse((msg.content as any[]).filter(c => c.type === 'text').map(c => c.text).join('')); } catch { continue; }
      checked++;
      const helpMissed = v.decision === 'deliver_with_help' && !CRISIS.test(found.body); // crisis words always open the Help sheet already
      if ((v.decision === 'block' && v.confidence >= 0.6) || helpMissed) {
        missed++;
        must(await admin.from('moderation').insert({ kind: 'recheck', target: `${item.kind}:${item.ref}`, body: found.keep ? found.body : null,
          action: v.decision === 'block' ? 'missed: should block' : 'missed: should show help', category: v.category, confidence: v.confidence, model: msg.model }));
      }
    }
    must(await admin.from('rechecks').update({ checked, missed, collected_at: new Date().toISOString() }).eq('id', b.id));
    done++;
  }
  return done;
}

async function send() {
  const rows = must(await admin.rpc('recheck_sample', { n: SAMPLE })) as { kind: 'message' | 'post'; ref: number; body: string; place: string }[];
  if (!rows.length) return 0;
  const items: Item[] = rows.map((r, n) => ({ id: `r${n}`, kind: r.kind, ref: r.ref }));
  const batch = await client.messages.batches.create({
    requests: rows.map((r, n) => ({
      custom_id: `r${n}`,
      params: {
        model: CAREFUL, max_tokens: 4000,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: MESSAGE_SCHEMA } },
        system: [{ type: 'text', text: POLICY, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `${quote('context', `Where: ${r.place}\nThis message was already delivered; this is a second check.`)}\n${quote('message', r.body)}\nCheck this message.` }],
      },
    })),
  // deno-lint-ignore no-explicit-any
  } as any);
  must(await admin.from('rechecks').insert({ batch_id: batch.id, items }));
  return rows.length;
}

Deno.serve(async req => {
  const job = must(await admin.from('jobs').select('token').eq('name', 'nightly-recheck').maybeSingle()) as { token: string } | null;
  if (!job || req.headers.get('x-job-token') !== job.token) return reply({ ok: false }, 403);
  try {
    const collected = await collect(), sent = await send();
    return reply({ ok: true, collected, sent });
  } catch (e) { console.error(e); return reply({ ok: false, error: 'trouble' }, 500); }
});
