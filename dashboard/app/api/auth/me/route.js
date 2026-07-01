import { getSession } from '../../../../lib/auth';
export async function GET(req) {
  const session = getSession(req);
  return Response.json({ ok:true, authenticated:Boolean(session), session });
}
