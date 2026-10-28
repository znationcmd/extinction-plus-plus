// CMD Sphere: HTTP revalidation for public immutable-in-process client assets.
// Files are loaded once per deployed process; updates produce new SHA-256 ETags.
// Do NOT use for API responses, chat messages, profiles, cookies or user uploads.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export function createPublicAssetResponder(fileURL, contentType) {
  const bytes = readFileSync(fileURL);
  const etag = '"sha256-' + createHash("sha256").update(bytes).digest("hex") + '"';
  return function servePublicAsset(req, res) {
    if(req.method !== "GET" && req.method !== "HEAD") return false;
    const headers = {
      "content-type": contentType,
      "cache-control": "public, no-cache, must-revalidate",
      "etag": etag,
      "x-content-type-options": "nosniff",
      "vary": "Accept-Encoding"
    };
    const requested = String(req.headers?.["if-none-match"] || "")
      .split(",").map(t => t.trim());
    const notModified = requested.includes("*") || requested.includes(etag)
      || requested.includes("W/" + etag);
    res.writeHead(notModified ? 304 : 200, headers);
    res.end(notModified || req.method === "HEAD" ? undefined : bytes);
    return true;
  };
}
