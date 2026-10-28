// Conditional responses save bandwidth for NEURIA's unchanged public client bundle.
// Revalidate each visit so a new Railway deployment becomes visible immediately.
// No API responses, user data, cookies or authenticated content are cached here.
import { createHash } from 'node:crypto';

export function cachedClientBundle(request: Request, source: string): Response {
  const etag = '"' + createHash('sha256').update(source).digest('hex') + '"';
  const headers = {
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'private, no-cache, must-revalidate',
    'etag': etag,
    'vary': 'Accept-Encoding',
    'x-content-type-options': 'nosniff'
  };
  if (request.headers.get('if-none-match')?.split(',').map(s => s.trim()).includes(etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(source, { status: 200, headers });
}
