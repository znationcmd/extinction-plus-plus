// Option PostgreSQL Railway. Les routes actuelles gardent un fallback JSON stable.
// Cette lib permet de tester/migrer la base Railway sans casser le bot.
export async function pgQuery(sql, params = []) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  const { Pool } = await import('pg');
  globalThis.__extinctionPgPool = globalThis.__extinctionPgPool || new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized:false } });
  return globalThis.__extinctionPgPool.query(sql, params);
}

export async function pgHealth() {
  if (!process.env.DATABASE_URL) return { enabled:false };
  const r = await pgQuery('select now() as now');
  return { enabled:true, now:r.rows?.[0]?.now };
}
