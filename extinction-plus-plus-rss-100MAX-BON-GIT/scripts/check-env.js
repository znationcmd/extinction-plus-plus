const config = require('../config');

function value(key) {
  if (key === 'DISCORD_TOKEN') return process.env.DISCORD_TOKEN || process.env.TOKEN || config.DISCORD_TOKEN || '';
  return process.env[key] || config[key] || '';
}

const required = ['DISCORD_TOKEN', 'CLIENT_ID'];

console.log('=== EXTINCTION++ RSS CONFIG CHECK ===');

let ok = true;
for (const key of required) {
  if (!value(key)) {
    console.log(`❌ Manquant: ${key}`);
    ok = false;
  } else {
    console.log(`✅ ${key}: OK`);
  }
}

for (const key of ['DASHBOARD_URL', 'SHOP_URL', 'GUILD_ID', 'NITRADO_TOKEN', 'CLIENT_SECRET', 'OWNER_ID', 'ADMIN_ROLE_ID']) {
  console.log(`${value(key) ? '✅' : '⚠️'} ${key}: ${value(key) ? 'OK' : 'non renseigné'}`);
}

if (!ok) process.exit(1);
console.log('✅ Configuration principale OK');
