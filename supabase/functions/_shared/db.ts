// Database access for the functions. They act for the signed-in member, checked from their login token,
// and write with the service key, which only these functions hold.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

export const admin: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

export const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// The member making the request, or null.
export async function member(req: Request): Promise<{ id: string } | null> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ? { id: data.user.id } : null;
}

// Runs a handler with CORS, sign-in and error handling. Errors never show details to the member.
export function serve(handler: (me: { id: string }, body: Record<string, unknown>) => Promise<Response>) {
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const me = await member(req); if (!me) return reply({ ok: false, error: 'Please sign in again.' }, 401);
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { return reply({ ok: false, error: 'bad request' }, 400); }
    try { return await handler(me, body); } catch (e) { console.error(e); return reply({ ok: false, error: 'trouble' }, 500); }
  });
}
// How many of a member's rows a table has since `hours` ago. Used for limits that stop anyone running up the safety check's costs.
export async function recent(table: string, column: string, id: string, hours: number, kinds?: string[]) {
  let q = admin.from(table).select('id', { count: 'exact', head: true }).eq(column, id).gte('created_at', new Date(Date.now() - hours * 3600e3).toISOString());
  if (kinds) q = q.in('kind', kinds);
  const { count, error } = await q; if (error) throw new Error(error.message);
  return count || 0;
}
export const must = <T>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };
