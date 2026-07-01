import { baseUrl, makeSession, saveSession, cookieValue, isGuildAdmin } from '../../../../lib/auth';

function cookie(name, header='') {
  const item = String(header).split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  return item ? decodeURIComponent(item.slice(name.length+1)) : '';
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookie('extinction_oauth_state', req.headers.get('cookie') || '');
  if (!code || !state || state !== savedState) return Response.json({ ok:false, error:'OAuth state invalide' }, { status:400 });

  const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return Response.json({ ok:false, error:'CLIENT_ID ou CLIENT_SECRET manquant' }, { status:500 });

  const redirectUri = `${baseUrl(req)}/api/auth/callback`;
  const body = new URLSearchParams({ client_id:clientId, client_secret:clientSecret, grant_type:'authorization_code', code, redirect_uri:redirectUri });
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body });
  const token = await tokenRes.json();
  if (!tokenRes.ok) return Response.json({ ok:false, error:'Discord token refusé', details:token }, { status:400 });

  const headers = { Authorization:`Bearer ${token.access_token}` };
  const [userRes, guildsRes] = await Promise.all([
    fetch('https://discord.com/api/users/@me', { headers }),
    fetch('https://discord.com/api/users/@me/guilds', { headers })
  ]);
  const user = await userRes.json();
  const guildsRaw = await guildsRes.json();
  const guilds = Array.isArray(guildsRaw) ? guildsRaw.filter(isGuildAdmin).map(g => ({ id:g.id, name:g.name, icon:g.icon || '', owner:g.owner || false, permissions:g.permissions })) : [];
  const session = makeSession({ id:user.id, username:user.username, avatar:user.avatar || '' }, guilds);
  saveSession(session);

  return new Response(null, {
    status:302,
    headers:{
      Location:'/dashboard',
      'Set-Cookie': `extinction_session=${encodeURIComponent(cookieValue(session.id))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600; Secure`
    }
  });
}
