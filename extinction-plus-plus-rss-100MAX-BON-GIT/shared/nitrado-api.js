const config = require('../config');

function getToken(options = {}) {
  const token = options.token || process.env.NITRADO_TOKEN || config.NITRADO_TOKEN;
  if (!token) throw new Error('Token Nitrado manquant. Utilise /nitrado connect token:<ton_token> ou ajoute NITRADO_TOKEN dans Railway pour test global.');
  return token;
}

async function request(endpoint, options = {}) {
  const res = await fetch(`https://api.nitrado.net${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${getToken(options)}`,
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

function withToken(token) {
  return {
    request: (endpoint, options = {}) => request(endpoint, { ...options, token }),
    listServices: () => request('/services', { token }),
    getGameServer: (serviceId) => request(`/services/${serviceId}/gameservers`, { token }),
    getFileServer: (serviceId) => request(`/services/${serviceId}/gameservers/file_server`, { token }),
    restart: (serviceId) => request(`/services/${serviceId}/gameservers/restart`, { method: 'POST', token }),
    start: (serviceId) => request(`/services/${serviceId}/gameservers/start`, { method: 'POST', token }),
    stop: (serviceId) => request(`/services/${serviceId}/gameservers/stop`, { method: 'POST', token })
  };
}

function servicesSummary(data) {
  return (data?.data?.services || []).map(s => ({
    id: String(s.id),
    name: s.details?.name || s.type || 'Service Nitrado',
    address: s.details?.address || '',
    status: s.status || s.details?.status || 'unknown',
    game: s.details?.game || s.type || ''
  }));
}

module.exports = {
  request,
  withToken,
  listServices: () => request('/services'),
  getGameServer: (serviceId) => request(`/services/${serviceId}/gameservers`),
  getFileServer: (serviceId) => request(`/services/${serviceId}/gameservers/file_server`),
  restart: (serviceId) => request(`/services/${serviceId}/gameservers/restart`, { method: 'POST' }),
  start: (serviceId) => request(`/services/${serviceId}/gameservers/start`, { method: 'POST' }),
  stop: (serviceId) => request(`/services/${serviceId}/gameservers/stop`, { method: 'POST' }),
  servicesSummary
};
