export async function nitradoRequest(endpoint, token, options = {}) {
  if (!token) throw new Error('Token Nitrado manquant');
  const res = await fetch(`https://api.nitrado.net${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Nitrado API ${res.status}: ${text.slice(0, 700)}`);
  return data;
}

export function servicesSummary(data) {
  return (data?.data?.services || []).map(s => ({
    id: String(s.id),
    name: s.details?.name || s.type || 'Service Nitrado',
    address: s.details?.address || '',
    status: s.status || s.details?.status || 'unknown',
    game: s.details?.game || s.type || '',
    type: s.type || '',
    location: s.location || s.details?.location || ''
  }));
}

export async function nitradoDownloadText(serviceId, filePath, token) {
  const meta = await nitradoRequest(`/services/${serviceId}/gameservers/file_server/download?file=${encodeURIComponent(filePath)}`, token);
  const url = meta?.data?.token?.url || meta?.data?.url || meta?.url;
  if (!url) throw new Error('URL de téléchargement Nitrado introuvable');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement fichier Nitrado impossible: ${res.status}`);
  return await res.text();
}

export async function nitradoUploadText(serviceId, filePath, content, token) {
  // L'API Nitrado varie selon jeux/permissions. Cette fonction prépare l'upload multipart standard et renvoie l'erreur exacte si le compte n'a pas accès.
  const parts = String(filePath).split('/').filter(Boolean);
  const filename = parts.pop();
  const dir = '/' + parts.join('/');
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), filename);
  const res = await fetch(`https://api.nitrado.net/services/${serviceId}/gameservers/file_server/upload?path=${encodeURIComponent(dir || '/')}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Upload fichier Nitrado impossible ${res.status}: ${text.slice(0, 700)}`);
  return data;
}

export async function appendWhitelistUid({ serviceId, whitelistPath, uid, token }) {
  if (!serviceId) throw new Error('serviceId manquant');
  if (!whitelistPath) throw new Error('whitelistPath manquant');
  if (!uid) throw new Error('UID/SteamID manquant');
  const original = await nitradoDownloadText(serviceId, whitelistPath, token).catch(() => '');
  const lines = original.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!lines.includes(String(uid).trim())) lines.push(String(uid).trim());
  const next = lines.join('\n') + '\n';
  const uploaded = await nitradoUploadText(serviceId, whitelistPath, next, token);
  return { updated: true, alreadyPresent: original.includes(String(uid).trim()), uploaded };
}
