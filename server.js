const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return child;
}

const port = process.env.PORT || 3000;
const dashboardDir = path.join(__dirname, 'dashboard');

console.log(`Starting Extinction++ RSS on port ${port}`);

run('dashboard', 'npm', ['run', 'start', '--', '-p', String(port)], dashboardDir);

const hasToken = process.env.DISCORD_TOKEN || process.env.TOKEN || config.DISCORD_TOKEN;
if (hasToken) {
  run('bot', 'node', ['index.js'], __dirname);
} else {
  console.log('DISCORD_TOKEN missing in env/config.js: dashboard only mode.');
}
