const config = require('../config');

function getToken() {
  const token = process.env.NITRADO_TOKEN || config.NITRADO_TOKEN;
  if (!token) throw new Error('NITRADO_TOKEN manquant dans Railway Variables ou config.js');
  return token;
}

async function request(endpoint, options = {}) {
  const res = await fetch(`https://api.nitrado.net${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${getToken()}`,
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
  listServices: () => request('/services'),
  getGameServer: (serviceId) => request(`/services/${serviceId}/gameservers`),
  getFileServer: (serviceId) => request(`/services/${serviceId}/gameservers/file_server`),
  restart: (serviceId) => request(`/services/${serviceId}/gameservers/restart`, { method: 'POST' }),
  start: (serviceId) => request(`/services/${serviceId}/gameservers/start`, { method: 'POST' }),
  stop: (serviceId) => request(`/services/${serviceId}/gameservers/stop`, { method: 'POST' }),
  servicesSummary
};
