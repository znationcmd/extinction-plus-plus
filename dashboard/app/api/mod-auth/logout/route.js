import { cookies } from 'next/headers';
import { sameOrigin, failure } from '../../../../lib/mod-auth';
export async function POST(req) {
  try { sameOrigin(req); (await cookies()).delete('extinction_mod_session'); return Response.json({ok:true}); }
  catch(e) { return failure(e); }
}
