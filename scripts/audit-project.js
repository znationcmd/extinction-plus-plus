const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const checks = [
  ['Bot index.js', 'index.js'],
  ['Dashboard package', 'dashboard/package.json'],
  ['DB JSON', 'shared/database.json'],
  ['Nitrado shared', 'shared/nitrado-api.js'],
  ['Dashboard API Nitrado', 'dashboard/app/api/nitrado/route.js'],
  ['Dashboard API Health', 'dashboard/app/api/health/route.js'],
  ['Dashboard API Whitelist', 'dashboard/app/api/whitelist/route.js'],
  ['Dashboard API GitHub', 'dashboard/app/api/github/route.js'],
  ['Dashboard API IA', 'dashboard/app/api/ai/route.js'],
  ['Dashboard secure lib', 'dashboard/lib/secure.js']
];
console.log('Audit Extinction++ RSS');
for (const [name, rel] of checks) console.log(`${fs.existsSync(path.join(root, rel)) ? '✅' : '❌'} ${name} - ${rel}`);
console.log('\nVariables importantes:');
for (const k of ['DISCORD_TOKEN','CLIENT_ID','PUBLIC_URL','SECRET_KEY','NITRADO_TOKEN','OPENAI_API_KEY','GITHUB_TOKEN']) console.log(`${process.env[k] ? '✅' : '⚠️'} ${k}`);
