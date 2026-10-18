// Shared request boundaries, evaluated before any API handler or database write.
export function assertApiOrigin(req, url, baseUrl) {
  if (!url.pathname.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const reject = () => { throw Object.assign(new Error('Origine non autorisée.'), {status: 403}); };
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).origin !== new URL(baseUrl).origin) reject(); }
    catch { reject(); }
  } else if (req.headers['sec-fetch-site'] === 'cross-site') reject();
  // Non-browser bots/webhooks omit Origin and Fetch Metadata and retain their
  // own authentication. Never derive the trusted origin from the Host header.
}

export async function readBoundedJson(req, maxBytes) {
  const tooLarge = () => Object.assign(new Error('Requête trop volumineuse.'), {status: 413});
  const declared = Number(req.headers?.['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge();
  const chunks = []; let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw tooLarge();
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('JSON invalide.'), {status: 400}); }
}
