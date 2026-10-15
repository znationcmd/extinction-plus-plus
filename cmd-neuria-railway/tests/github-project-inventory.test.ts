import { test } from "node:test";
import assert from "node:assert/strict";
import { listAuthorizedProjects } from "../github-project-inventory.ts";

const repo = (owner: string, name: string, privateRepo: boolean) => ({
  owner: { login: owner }, name, full_name: `${owner}/${name}`,
  description: null, private: privateRepo, updated_at: "2026-10-15T00:00:00Z",
  default_branch: "main", html_url: `https://github.com/${owner}/${name}`, archived: false
});

test("includes authorized private repos and filters other owners", async () => {
  let requestedUrl = "";
  const fetcher = async (input: URL | RequestInfo, init?: RequestInit) => {
    requestedUrl = String(input);
    assert.equal(init?.headers && (init.headers as Record<string,string>).Authorization, "Bearer test-token");
    return new Response(JSON.stringify([repo("znationcmd", "private-project", true), repo("someone-else", "shared", false)]), { status: 200 });
  };
  const result = await listAuthorizedProjects({ owner: "znationcmd", token: "test-token", fetcher: fetcher as typeof fetch });
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].private, true);
  assert.equal(result.projects[0].fullName, "znationcmd/private-project");
  assert.match(requestedUrl, /api.github.com\/user\/repos/);
  assert.match(requestedUrl, /visibility=all/);
});

test("rejects invalid owner and missing token", async () => {
  await assert.rejects(listAuthorizedProjects({ owner: "../other", token: "test" }), /Invalid owner/);
  await assert.rejects(listAuthorizedProjects({ owner: "znationcmd", token: "" }), /Missing GitHub token/);
});

test("rejects GitHub errors without leaking the token", async () => {
  const fetcher = async () => new Response("denied", { status: 403 });
  await assert.rejects(listAuthorizedProjects({ owner: "znationcmd", token: "secret", fetcher: fetcher as typeof fetch }), /GitHub API error: 403/);
});
