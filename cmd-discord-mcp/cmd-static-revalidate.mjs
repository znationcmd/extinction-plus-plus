// Cache only explicitly public, code-only assets. User data and API responses
// must never pass through this helper. The asset is loaded per server process:
// a fresh Railway deployment computes a fresh SHA-256 checksum.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

export function createConditionalStaticHandler(file, contentType) {
  let snapshot;
  return function serveStatic(req, res) {
    if(req.method!=="GET" && req.method!=="HEAD") {
      res.writeHead(405, {"allow":"GET, HEAD", "cache-control":"no-store"});
      res.end();
      return;
    }
    if(!snapshot) {
      const bytes=readFileSync(file);
      snapshot={bytes, etag:'"sha256-'+createHash("sha256").update(bytes).digest("hex")+'"'};
    }
    const headers={
      "content-type":contentType,
      "cache-control":"public, no-cache, must-revalidate",
      "etag":snapshot.etag,
      "x-content-type-options":"nosniff"
    };
    const previous=String(req.headers?.["if-none-match"] || "");
    const matches=previous.split(",").map(tag=>tag.trim())
      .some(tag=>tag==="*" || tag===snapshot.etag || tag==="W/"+snapshot.etag);
    if(matches) {
      res.writeHead(304,headers);
      res.end();
      return;
    }
    res.writeHead(200,{...headers,"content-length":snapshot.bytes.length});
    res.end(req.method==="HEAD" ? undefined : snapshot.bytes);
  };
}
