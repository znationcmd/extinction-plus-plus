const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

const children = new Set();
let stopping = false;
let shutdownTimer;

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  shutdownTimer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 5000);
  shutdownTimer.unref();
}

function run(name, args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env });
  children.add(child);
  child.on('error', error => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    console.log(`[${name}] exited with code ${code}, signal ${signal}`);
    if (!stopping) shutdown(code || 1);
  });
  child.on('close', () => {
    children.delete(child);
    if (stopping && children.size === 0) clearTimeout(shutdownTimer);
  });
  return child;
}

const port = process.env.PORT || 3000;
const dashboardDir = path.join(__dirname, 'dashboard');
const databasePath = path.resolve(__dirname, config.DATABASE_PATH);
const env = { ...process.env, DATABASE_PATH: databasePath, BOT_DATABASE_PATH: databasePath };

console.log(`Starting Extinction++ RSS on port ${port}`);
run('dashboard', [path.join(dashboardDir, 'node_modules/next/dist/bin/next'),
  'start', '-H', '0.0.0.0', '-p', String(port)], dashboardDir, env);

if (config.DISCORD_TOKEN) {
  run('bot', [path.join(__dirname, 'index.js')], __dirname, env);
} else {
  console.log('DISCORD_TOKEN missing in env/config.js: dashboard only mode.');
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
