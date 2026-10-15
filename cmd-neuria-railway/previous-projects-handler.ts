import { listAuthorizedProjects } from "./github-project-inventory.ts";

/**
 * API adapter for CMD NEURIA.
 * Caller MUST enforce NEURIA_WORK_AUTH and rate limits before invoking.
 * This function does not restore or deploy projects.
 */
export async function previousProjectsHandler(request: Request): Promise<Response> {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return json({ error: "Connexion GitHub non configurée" }, 503);
  let body: any;
  try {
    if (Number(request.headers.get("content-length") || 0) > 2500) return json({ error: "Requête trop volumineuse" }, 413);
    const raw = await request.text();
    if (raw.length > 2500) return json({ error: "Requête trop volumineuse" }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "JSON invalide" }, 400); }
  const owner = String(body?.owner || "").trim();
  const page = body?.page === undefined ? 1 : body.page;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(owner) || !Number.isInteger(page) || page < 1 || page > 100)
    return json({ error: "Propriétaire ou page invalide" }, 400);
  try {
    const result = await listAuthorizedProjects({ owner, page, token });
    return json({ executed: true, source: "github", owner, ...result,
      note: "Inventaire uniquement. Restauration des fichiers, bases de données et déploiements non effectuée." });
  } catch {
    return json({ error: "Recherche des projets échouée" }, 502);
  }
}
