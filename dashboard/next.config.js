const path = require('path');

module.exports = {
  serverExternalPackages: ['pg'],
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Service-Worker-Allowed', value: '/' }
    ] }];
  }
};
