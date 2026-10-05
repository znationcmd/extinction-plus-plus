import { cookies } from 'next/headers';
import { sameOrigin, failure, unseal, revokeSession } from '../../../../lib/mod-auth';
export async function POST(req) {
  try { sameOrigin(req); const jar=await cookies(); await revokeSession(unseal(jar.get('extinction_mod_session')?.value)); jar.delete('extinction_mod_session'); jar.delete('extinction_guild'); return Response.json({ok:true}); }
  catch(e) { return failure(e); }
}
