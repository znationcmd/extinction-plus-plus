import store from '../../../../shared/dayz-mod-store';
import { authorize, session, discord, sameOrigin, failure } from '../../../lib/mod-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(req) {
  try {
    const guildId = new URL(req.url).searchParams.get('guildId');
    if (!guildId) {
      const s = await session();
      const guilds = await discord('/users/@me/guilds', s.token);
      return Response.json({ name:s.name, guilds:guilds.map(g=>({id:g.id,name:g.name,owner:g.owner})) }, { headers:{'Cache-Control':'no-store'} });
    }
    const access = await authorize(guildId);
    const p = await store.ready();
    const { rows:servers } = await p.query('SELECT id,name,service_id,config,state,heartbeat,active FROM dayz_mod_servers WHERE guild_id=$1 AND active=TRUE ORDER BY name', [guildId]);
    const { rows:jobs } = await p.query('SELECT j.id,j.server_id,j.actor_id,j.status,j.phase,j.created_at,j.updated_at FROM dayz_mod_jobs j JOIN dayz_mod_servers s ON s.id=j.server_id WHERE s.guild_id=$1 ORDER BY j.created_at DESC LIMIT 30', [guildId]);
    return Response.json({ servers,jobs,owner:access.guild.owner,roleIds:access.roles }, { headers:{'Cache-Control':'no-store'} });
  } catch(e) { return failure(e); }
}
export async function POST(req) {
  try {
    sameOrigin(req);
    const body = await req.json();
    const access = await authorize(body.guildId, ['roles','recover'].includes(body.action));
    const p = await store.ready();
    if (body.action === 'roles') {
      const roles = body.roleIds;
      if (!Array.isArray(roles) || roles.length > 20 || roles.some(r=>!/^\d{15,22}$/.test(r) || r===body.guildId)) throw new Error('IDs de rôles Fondateur invalides. Le rôle @everyone est interdit.');
      await p.query('INSERT INTO dayz_mod_access(guild_id,role_ids) VALUES($1,$2) ON CONFLICT(guild_id) DO UPDATE SET role_ids=EXCLUDED.role_ids', [body.guildId,JSON.stringify([...new Set(roles)])]);
      return Response.json({ok:true});
    }
    const {rows} = await p.query('SELECT * FROM dayz_mod_servers WHERE id=$1 AND guild_id=$2 AND active=TRUE', [body.serverId,body.guildId]);
    const server = rows[0];
    if (!server) throw Object.assign(new Error('Serveur introuvable.'),{status:404});
    if (body.action === 'recover') {
      const result=await p.query(`UPDATE dayz_mod_servers s SET state=state || '{"recoveryRequired":false}'::jsonb WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM dayz_mod_jobs j WHERE j.service_id=s.service_id AND j.status IN ('queued','running')) RETURNING id`,[server.id]);
      if(!result.rowCount)throw new Error('Une opération est encore en attente ou en cours.');
      return Response.json({ok:true});
    }
    if (body.action === 'save') {
      const cfg = store.validateConfig(body.config);
      const conn = await p.connect();
      try {
        await conn.query('BEGIN');
        await conn.query('SELECT id FROM dayz_mod_servers WHERE id=$1 FOR UPDATE',[server.id]);
        const {rows:jobs} = await conn.query("SELECT id FROM dayz_mod_jobs WHERE service_id=$1 AND status IN ('queued','running')",[server.service_id]);
        if(jobs.length) throw new Error('Attends la fin de la mise à jour avant de modifier la configuration.');
        await conn.query('UPDATE dayz_mod_servers SET config=$1 WHERE id=$2',[JSON.stringify(cfg),server.id]);
        await conn.query('COMMIT');
      } catch(e) {await conn.query('ROLLBACK');throw e;} finally {conn.release();}
      return Response.json({ok:true});
    }
    if (body.action === 'update') return Response.json({ok:true,jobId:await store.enqueue(server,access.userId)});
    if (body.action === 'check') {
      await p.query("UPDATE dayz_mod_servers SET state=state || '{\"checkRequested\":true}'::jsonb WHERE id=$1", [server.id]);
      return Response.json({ok:true});
    }
    throw new Error('Action inconnue.');
  } catch(e) { return failure(e); }
}
