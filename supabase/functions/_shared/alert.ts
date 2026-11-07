// Email alerts to whoever runs User (Rusty, 7 Nov 2026), sent through Resend. The address and the Resend key are
// Supabase secrets (ALERT_EMAIL, RESEND_API_KEY), so they're never in the code, the app or the website.
// Alerts never carry a username or anything a member wrote: only what happened and the case number.
export async function alert(subject: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY'), to = Deno.env.get('ALERT_EMAIL');
  if (!key || !to) { console.error('alert not sent: RESEND_API_KEY or ALERT_EMAIL is not set'); return false; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'User alerts <onboarding@resend.dev>', to: [to], subject, text }),
  });
  if (!r.ok) console.error('alert failed', r.status, (await r.text()).slice(0, 200));
  return r.ok;
}
