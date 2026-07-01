import crypto from 'crypto';
import { baseUrl } from '../../../../lib/auth';

export async function GET(req) {
  const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  if (!clientId) return Response.json({ ok:false, error:'CLIENT_ID manquant dans Railway' }, { status:500 });
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${baseUrl(req)}/api/auth/callback`;
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `extinction_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`
    }
  });
}
