import { test } from "node:test";
import assert from "node:assert/strict";
import { previousProjectsHandler } from "../previous-projects-handler.ts";

const endpoint = "http://localhost/api/work/previous-project-retrieval";
const post = (payload: unknown, headers: Record<string,string> = {}) =>
  new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) });

test("rejects methods other than POST", async () => {
  const response = await previousProjectsHandler(new Request(endpoint));
  assert.equal(response.status, 405);
});

test("rejects missing GitHub configuration", async () => {
  const original = process.env.GITHUB_TOKEN;
  const fallback = process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  try {
    const response = await previousProjectsHandler(post({ owner: "znationcmd" }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
    if (fallback === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = fallback;
  }
});

test("rejects invalid owner and page without reaching GitHub", async () => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  try {
    assert.equal((await previousProjectsHandler(post({ owner: "../other" }))).status, 400);
    assert.equal((await previousProjectsHandler(post({ owner: "znationcmd", page: 0 }))).status, 400);
    assert.equal((await previousProjectsHandler(post({ owner: "znationcmd", page: "2" }))).status, 400);
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
});

test("rejects oversized JSON requests", async () => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  try {
    const response = await previousProjectsHandler(post({ owner: "znationcmd", extra: "x".repeat(3000) }));
    assert.equal(response.status, 413);
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
});
