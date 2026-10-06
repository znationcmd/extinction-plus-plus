const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const config = require('./config');
const topServers = require('./shared/top-servers');

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
  const child = spawn(process.execPath, args, { cwd, stdio: ['inherit','inherit','inherit','ipc'], env });
  children.add(child);
  child.on('error', error => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    console.log(`[${name}] exited with code ${code}, signal ${signal}`);
    if (!stopping && name === 'dashboard' && config.DISCORD_TOKEN) {
      console.error('[dashboard] stopped; Discord bot remains running.');
      return;
    }
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
let discordReady=false;
const hasDashboardBuild=fs.existsSync(path.join(dashboardDir,'.next','BUILD_ID'));
if(hasDashboardBuild) {
  run('dashboard',[require.resolve('next/dist/bin/next',{paths:[dashboardDir,__dirname]}),'start','-H','0.0.0.0','-p',String(port)],dashboardDir,env);
} else {
  // Separate Railway services do not ship a Next production build on the bot.
  topServers.init().catch(e=>console.error('Top Serveurs :',e.code||e.message));
  const health=http.createServer(async(req,res)=>{
    if(await topServers.http(req,res))return;
    if(req.url==='/health') {res.writeHead(discordReady?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({discordConnected:discordReady,dashboard:'separate',uptime:Math.floor(process.uptime())}));return;}
    if(req.url==='/' && /^https:\/\//.test(config.DASHBOARD_URL)) {res.writeHead(302,{Location:config.DASHBOARD_URL});res.end();return;}
    res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Utilise le service Dashboard.'}));
  }).listen(Number(port),'0.0.0.0');
  process.on('SIGTERM',()=>health.close());process.on('SIGINT',()=>health.close());
}


if (config.DISCORD_TOKEN) {
  const bot=run('bot',[path.join(__dirname,'index.js')],__dirname,env);
  bot.on('message',m=>{if(m.type==='discordReady')discordReady=!!m.ready;});
  bot.on('exit',()=>{discordReady=false;});
} else {
  console.log('DISCORD_TOKEN missing in env/config.js: dashboard only mode.');
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
