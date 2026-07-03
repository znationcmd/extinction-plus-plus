import { clearSession } from '../../../../lib/auth';
export async function POST(req) {
  clearSession(req);
  return new Response(JSON.stringify({ ok:true }), { headers:{ 'Content-Type':'application/json', 'Set-Cookie':'extinction_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure' } });
}
