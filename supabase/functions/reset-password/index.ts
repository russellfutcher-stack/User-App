// Forgot password (Rusty, 8 Nov 2026). Called signed out, so it checks no login.
//   { step: 'send', username, email }            emails a 6-digit code if the username and its saved reset email match.
//   { step: 'reset', username, code, password }  sets the new password if the code is right.
// The reply to 'send' is always the same (even when it sends nothing because it's too soon), so nobody can use it to learn who has which email.
// Codes last 15 minutes, allow 5 tries, can be re-sent every 2 minutes and 5 times a day. Only a hash of the code is kept.
import { admin, CORS, reply } from '../_shared/db.ts';

const FAILED = "That code didn't work. Check it, or ask for a new one. Codes last 15 minutes.";
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');

async function sendEmail(to: string, code: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('reset email not sent: RESEND_API_KEY is not set'); return; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('RESET_FROM') || 'User <onboarding@resend.dev>', to: [to], subject: 'Your User password reset code',
      text: `Your code to set a new password in User is ${code}.\n\nIt lasts 15 minutes. If you didn't ask for this, you can ignore this email; your password hasn't changed.`,
    }),
  });
  if (!r.ok) console.error('reset email failed', r.status, (await r.text()).slice(0, 200));
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return reply({ ok: false, error: 'bad request' }, 400); }
  try {
    const username = String(b.username || '').trim().slice(0, 40);
    if (!username) return reply({ ok: false, error: 'bad request' }, 400);
    const { data: p } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    const id = (p as { id: string } | null)?.id;

    if (b.step === 'send') {
      const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
      const sent = reply({ ok: true });
      if (!id) return sent;
      const { data: e } = await admin.from('recovery_emails').select('email').eq('member', id).maybeSingle();
      if (!e || (e as { email: string }).email !== email) return sent;
      const { data: old } = await admin.from('reset_codes').select('sent_at, sends_today').eq('member', id).maybeSingle();
      const o = old as { sent_at: string; sends_today: number } | null, age = o ? Date.now() - Date.parse(o.sent_at) : Infinity;
      // Too soon, or too many today: quietly send nothing, so the reply still gives nothing away.
      const today = o && age < 86400e3 ? o.sends_today + 1 : 1;
      if (age < 120e3 || today > 5) return sent;
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
      await admin.from('reset_codes').upsert({ member: id, code_hash: await sha(id + code), expires_at: new Date(Date.now() + 15 * 60e3).toISOString(),
        tries: 0, sent_at: new Date().toISOString(), sends_today: today });
      // Sent in the background, so a match doesn't take noticeably longer to answer.
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil(sendEmail(email, code).catch(e => console.error(e)));
      return sent;
    }

    if (b.step === 'reset') {
      const code = String(b.code || '').trim(), password = String(b.password || '');
      if (password.length < 8 || password.length > 72) return reply({ ok: false, error: 'Your new password needs at least 8 characters.' });
      if (!id) return reply({ ok: false, error: FAILED });
      const { data: c } = await admin.from('reset_codes').select('code_hash, expires_at, tries').eq('member', id).maybeSingle();
      const r = c as { code_hash: string; expires_at: string; tries: number } | null;
      if (!r || Date.parse(r.expires_at) < Date.now() || r.tries >= 5) return reply({ ok: false, error: FAILED });
      if (r.code_hash !== await sha(id + code)) {
        await admin.from('reset_codes').update({ tries: r.tries + 1 }).eq('member', id);
        return reply({ ok: false, error: FAILED });
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) { console.error(error.message); return reply({ ok: false, error: /weak|leaked|pwned/i.test(error.message) ? 'Please choose a stronger password.' : 'trouble' }); }
      await admin.from('reset_codes').update({ expires_at: new Date(0).toISOString() }).eq('member', id); // used up, but keeps the daily count
      return reply({ ok: true });
    }
    return reply({ ok: false, error: 'bad request' }, 400);
  } catch (e) { console.error(e); return reply({ ok: false, error: 'trouble' }, 500); }
});
