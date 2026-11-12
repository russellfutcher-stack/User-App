// Milestones (Rusty, 12 Nov 2026). Started once a day by pg_cron (public.run_job), never by members.
// The first time there are 500 real members while the sample members still exist, it emails whoever runs User:
// that's the signal to remove the sample members. The dashboard shows the same reminder until they're gone.
import { admin, must, reply } from '../_shared/db.ts';
import { alert } from '../_shared/alert.ts';

Deno.serve(async req => {
  const job = must(await admin.from('jobs').select('token').eq('name', 'milestones').maybeSingle()) as { token: string } | null;
  if (!job || req.headers.get('x-job-token') !== job.token) return reply({ ok: false }, 403);
  try {
    const due = must(await admin.rpc('milestone_due')) as boolean;
    if (due) await alert('User: 500 real members', 'User now has 500 real members.\n\nThis is the signal to remove the 100 sample members. The arbitrator dashboard shows the same reminder until they are removed.');
    return reply({ ok: true, sent: due });
  } catch (e) { console.error(e); return reply({ ok: false, error: 'trouble' }, 500); }
});
