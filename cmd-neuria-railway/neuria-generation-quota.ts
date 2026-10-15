import { Database } from "bun:sqlite";

/** Durable per-account 24h quotas. Requires NEURIA_QUOTA_DB_PATH on a persistent Railway volume. */
const WINDOW_MS = 24 * 60 * 60 * 1000;
let db;
export function quotaDatabase() {
  const path = Bun.env.NEURIA_QUOTA_DB_PATH;
  if (!path || !path.startsWith("/")) throw new Error("Persistent quota database path not configured");
  if (!db) {
    db = new Database(path, { create: true, strict: true });
    db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS generation_quota (account_id TEXT NOT NULL, engine TEXT NOT NULL CHECK(engine IN ('oracle','pulse')), reserved_at INTEGER NOT NULL, PRIMARY KEY(account_id,engine));");
  }
  return db;
}
export function reserveGeneration(accountId, engine, now = Date.now()) {
  if (typeof accountId !== "string" || !/^[a-zA-Z0-9:_-]{8,200}$/.test(accountId)) throw new Error("Verified account ID required");
  if (engine !== "oracle" && engine !== "pulse") throw new Error("Invalid engine");
  const database = quotaDatabase();
  return database.transaction(() => {
    const current = database.query("SELECT reserved_at FROM generation_quota WHERE account_id=? AND engine=?").get(accountId,engine);
    if (current && now - current.reserved_at < WINDOW_MS) return { allowed:false, retryAt:new Date(current.reserved_at + WINDOW_MS).toISOString() };
    database.query("INSERT INTO generation_quota(account_id,engine,reserved_at) VALUES(?,?,?) ON CONFLICT(account_id,engine) DO UPDATE SET reserved_at=excluded.reserved_at").run(accountId,engine,now);
    return { allowed:true, retryAt:new Date(now + WINDOW_MS).toISOString() };
  })();
}
export function refundFailedGeneration(accountId,engine,reservedAt) {
  // Refund only the matching reservation, so an older failed job cannot erase a newer quota.
  quotaDatabase().query("DELETE FROM generation_quota WHERE account_id=? AND engine=? AND reserved_at=?").run(accountId,engine,reservedAt);
}
