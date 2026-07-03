const fs = require('fs');
const path = require('path');

const checks = [
  'package.json',
  'server.js',
  'index.js',
  'deploy-commands.js',
  'config.js',
  'dashboard/package.json',
  'dashboard/app/page.jsx',
  'dashboard/components/Shell.jsx',
  'shared/database.json'
];

let ok = true;
for (const file of checks) {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) ok = false;
}

if (!ok) process.exit(1);
console.log('✅ Projet complet');
