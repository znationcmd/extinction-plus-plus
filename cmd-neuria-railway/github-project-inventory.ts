/**
 * CMD NEURIA — GitHub repository inventory.
 * Read-only: never restores files or databases and never deploys services.
 * The token must belong to an authorized GitHub account.
 */
export type ProjectSummary = {
  name: string; fullName: string; description: string | null;
  private: boolean; updatedAt: string | null; defaultBranch: string;
  url: string; archived: boolean;
};
export async function listAuthorizedProjects(options: {
  owner: string; token: string; page?: number; perPage?: number;
  fetcher?: typeof fetch;
}): Promise<{ projects: ProjectSummary[]; page: number; hasMore: boolean }> {
  const { owner, token, page = 1, perPage = 50, fetcher = fetch } = options;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(owner)) throw new Error("Invalid owner");
  if (!token) throw new Error("Missing GitHub token");
  if (!Number.isInteger(page) || page < 1 || page > 100) throw new Error("Invalid page");
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error("Invalid page size");
  // /user/repos includes private repositories available to the token.
  // Unlike /users/:owner/repos, this endpoint supports private inventory.
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("visibility", "all");
  url.searchParams.set("affiliation", "owner,collaborator,organization_member");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  const response = await fetcher(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "CMD-Neuria",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid GitHub response");
  const projects = rows.filter((repo: any) =>
    repo && repo.owner?.login?.toLowerCase() === owner.toLowerCase()
  ).map((repo: any): ProjectSummary => ({
    name: repo.name, fullName: repo.full_name,
    description: repo.description ?? null, private: Boolean(repo.private),
    updatedAt: repo.updated_at ?? null, defaultBranch: repo.default_branch,
    url: repo.html_url, archived: Boolean(repo.archived)
  }));
  return { projects, page, hasMore: rows.length === perPage };
}
