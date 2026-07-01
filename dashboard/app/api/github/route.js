export async function GET(req) {
  const url = new URL(req.url);
  const repo = url.searchParams.get('repo') || process.env.GITHUB_REPO || 'znationcmd/extinction-plus-plus';
  const token = process.env.GITHUB_TOKEN || '';
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const [repoRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`, { headers })
    ]);
    const repoData = await repoRes.json();
    const commits = await commitsRes.json();
    return Response.json({ ok: repoRes.ok, repo, repoData, commits: Array.isArray(commits) ? commits.map(c => ({ sha: c.sha, message: c.commit?.message, author: c.commit?.author?.name, date: c.commit?.author?.date })) : commits });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}
