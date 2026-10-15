/** CMD NEURIA: inventory of authorized public and private GitHub repositories. */
export async function listNeuriaProjects(owner: string, token: string, page = 1, fetcher: typeof fetch = fetch) {
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(owner)) throw new Error("Invalid owner");
  if (!token || !Number.isInteger(page) || page < 1 || page > 100) throw new Error("Invalid configuration");
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("visibility", "all");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("per_page", "50");
  url.searchParams.set("page", String(page));
  const upstream = await fetcher(url, { headers: {
    authorization: `Bearer ${token}`, accept: "application/vnd.github+json",
    "user-agent": "CMD-Neuria", "x-github-api-version": "2022-11-28"
  }, signal: AbortSignal.timeout(12000) });
  if (!upstream.ok) throw new Error(`GitHub error ${upstream.status}`);
  const data: unknown = await upstream.json();
  if (!Array.isArray(data)) throw new Error("Invalid response");
  const projects = data.filter((p: any) => p?.owner?.login?.toLowerCase() === owner.toLowerCase())
    .map((p: any) => ({ name: p.name, fullName: p.full_name,
      description: p.description, private: !!p.private, updatedAt: p.updated_at,
      defaultBranch: p.default_branch, archived: !!p.archived, url: p.html_url }));
  return { owner, page, projects, hasMore: data.length === 50 };
}
