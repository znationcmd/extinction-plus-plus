const {app,BrowserWindow,WebContentsView,ipcMain,session,dialog,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const HOME='https://cmd-browser-web-rzsb-production.up.railway.app';
let main,tabs=[],active=-1,sequence=0;
const statePath=()=>path.join(app.getPath('userData'),'browser-data.json');
let saved={bookmarks:[],history:[]};
function persist(){try{fs.writeFileSync(statePath(),JSON.stringify(saved))}catch{}}
function record(url,title){if(!/^https?:\/\//.test(url))return;saved.history.unshift({url,title:title||url,at:Date.now()});saved.history=saved.history.slice(0,1000);persist()}

const BAR=104;
const vpnRegions=['France','Allemagne','Pays-Bas','Royaume-Uni','États-Unis','Canada','Japon'];
const vpnStatus={connected:false,region:null,configured:[]};
function vpnProfiles(){const dir=path.join(app.getPath('userData'),'vpn-profiles');try{fs.mkdirSync(dir,{recursive:true});return vpnRegions.filter(region=>fs.existsSync(path.join(dir,'cmdvpn-'+({'France':'fr','Allemagne':'de','Pays-Bas':'nl','Royaume-Uni':'uk','États-Unis':'us','Canada':'ca','Japon':'jp'}[region])+'.conf')))}catch{return []}}
async function vpnReply(){
  const configured=vpnProfiles();
  let interfaces=[];let handshake=false;
  try{
    const {stdout}=await run('wg',['show','all','latest-handshakes'],{timeout:3500});
    const now=Math.floor(Date.now()/1000);
    for(const line of stdout.split('\n')){
      const parts=line.trim().split(/\s+/);
      if(parts.length>=3){interfaces.push(parts[0]);const time=Number(parts[2]);if(time>0&&now-time<180)handshake=true}
    }
  }catch{}
  return {connected:false,region:null,configured,interfaces:[...new Set(interfaces)],handshake,
    message:handshake?'Handshake WireGuard récent détecté. Connexion Internet, région et protection DNS non vérifiées.':'Aucun tunnel VPN vérifié. Activez un profil dans WireGuard puis contrôlez votre IP et vos DNS.'};
}

function normalize(raw){let q=String(raw||'').trim();if(!q)return HOME;if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(q)){q=/^(localhost|[^\s]+\.[^\s]+)(\/[^\s]*)?$/i.test(q)?'https://'+q:'https://cmd-browser-web-rzsb-production.up.railway.app/?q='+encodeURIComponent(q)}try{const u=new URL(q);return ['https:','http:'].includes(u.protocol)?u.href:HOME}catch{return HOME}}
function emit(){if(!main||main.isDestroyed())return;main.webContents.send('cmd:state',{active,tabs:tabs.map(t=>({id:t.id,title:t.title,url:t.view.webContents.getURL(),loading:t.loading,bookmarked:saved.bookmarks.includes(t.view.webContents.getURL()),back:t.view.webContents.canGoBack(),forward:t.view.webContents.canGoForward()}))})}
function resize(){if(!main||main.isDestroyed())return;const [w,h]=main.getContentSize();tabs.forEach((t,i)=>{if(i===active)t.view.setBounds({x:0,y:BAR,width:w,height:Math.max(100,h-BAR)})})}
function select(index){if(index<0||index>=tabs.length)return;tabs.forEach(t=>{try{main.contentView.removeChildView(t.view)}catch{}});active=index;main.contentView.addChildView(tabs[index].view);resize();emit()}
function newTab(url=HOME){const id=++sequence;const view=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,partition:'persist:cmd-browser'}});const t={id,view,title:'Nouvel onglet',loading:false};tabs.push(t);view.webContents.on('page-title-updated',(_,title)=>{t.title=title;emit()});view.webContents.on('did-start-loading',()=>{t.loading=true;emit()});view.webContents.on('did-stop-loading',()=>{t.loading=false;emit()});view.webContents.on('did-navigate',(_event,url)=>{record(url,t.title);emit()});view.webContents.on('did-navigate-in-page',emit);view.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//i.test(url))setImmediate(()=>newTab(url));return {action:'deny'}});view.webContents.on('will-navigate',(event,url)=>{if(!/^https?:\/\//i.test(url))event.preventDefault()});select(tabs.length-1);view.webContents.loadURL(normalize(url)).catch(()=>{});return id}
function closeTab(id){const i=tabs.findIndex(t=>t.id===id);if(i<0)return;const [t]=tabs.splice(i,1);try{main.contentView.removeChildView(t.view)}catch{};t.view.webContents.close();if(!tabs.length)newTab();else select(Math.min(i,tabs.length-1))}
function create(){main=new BrowserWindow({width:1280,height:850,minWidth:720,minHeight:500,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});main.loadFile('renderer.html');main.on('resize',resize);main.webContents.on('did-finish-load',emit);main.webContents.on('before-input-event',(event,input)=>{if(input.type!=='keyDown')return;const mod=input.control||input.meta;const key=input.key.toLowerCase();if(mod&&key==='t'){event.preventDefault();newTab()}else if(mod&&key==='w'){event.preventDefault();if(tabs[active])closeTab(tabs[active].id)}else if(mod&&key==='r'){event.preventDefault();tabs[active]?.view.webContents.reload()}else if(mod&&key==='l'){event.preventDefault();main.webContents.send('cmd:focus-address')}});newTab(HOME)}
app.whenReady().then(()=>{try{const data=JSON.parse(fs.readFileSync(statePath(),'utf8'));if(Array.isArray(data.bookmarks)&&Array.isArray(data.history))saved={bookmarks:data.bookmarks.filter(x=>typeof x==='string').slice(0,500),history:data.history.slice(0,1000)}}catch{};session.defaultSession.setPermissionRequestHandler(async(wc,permission,callback)=>{const permitted=['media','geolocation','notifications','clipboard-read','fullscreen'];if(!permitted.includes(permission)){callback(false);return}const url=wc.getURL();let host;try{host=new URL(url).hostname}catch{callback(false);return}const result=await dialog.showMessageBox(main||undefined,{type:'question',buttons:['Refuser','Autoriser'],defaultId:0,cancelId:0,title:'Autorisation CMD Browser',message:host+' demande : '+permission,detail:'N’autorisez que les sites auxquels vous faites confiance.'});callback(result.response===1)});const downloadSession=session.fromPartition('persist:cmd-browser');downloadSession.on('will-download',(_event,item)=>{const filename=path.basename(item.getFilename()).replace(/[\\/]/g,'_');const destination=path.join(app.getPath('downloads'),filename);item.setSavePath(destination);item.once('done',(_e,state)=>{if(main&&!main.isDestroyed())dialog.showMessageBox(main,{type:state==='completed'?'info':'warning',message:state==='completed'?'Téléchargement terminé':'Téléchargement interrompu',detail:filename})})});create();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
ipcMain.handle('cmd:home',()=>HOME);
ipcMain.handle('cmd:action',(_event,action,payload)=>{if(!main||main.isDestroyed())return;const t=tabs[active];switch(action){case 'new':newTab(payload||HOME);break;case 'select':select(tabs.findIndex(x=>x.id===payload));break;case 'close':closeTab(payload);break;case 'go':t?.view.webContents.loadURL(normalize(payload)).catch(()=>{});break;case 'back':if(t?.view.webContents.canGoBack())t.view.webContents.goBack();break;case 'forward':if(t?.view.webContents.canGoForward())t.view.webContents.goForward();break;case 'reload':t?.view.webContents.reload();break;case 'home':t?.view.webContents.loadURL(HOME).catch(()=>{});break;case 'bookmark':{const url=t?.view.webContents.getURL();if(url){saved.bookmarks=saved.bookmarks.includes(url)?saved.bookmarks.filter(x=>x!==url):[...saved.bookmarks,url];persist()}break};case 'bookmarks':return saved.bookmarks;case 'history':return saved.history;case 'clear-history':saved.history=[];persist();break}emit()});


const vpnIds={'France':'fr','Allemagne':'de','Pays-Bas':'nl','Royaume-Uni':'uk','États-Unis':'us','Canada':'ca','Japon':'jp'};
const vpnDir=()=>path.join(app.getPath('userData'),'vpn-profiles');
const vpnTunnel=region=>'cmdvpn-'+vpnIds[region];
const vpnFile=region=>path.join(vpnDir(),vpnTunnel(region)+'.conf');
function wireguardExe(){
 if(process.platform!=='win32')return null;
 const locations=[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean).map(dir=>path.join(dir,'WireGuard','wireguard.exe'));
 return locations.find(p=>fs.existsSync(p))||null;
}
async function vpnService(region){
 try{const {stdout}=await run('sc.exe',['query','WireGuardTunnel$'+vpnTunnel(region)],{timeout:5000,windowsHide:true});return /STATE\s*:\s*4\s+RUNNING/.test(stdout)}catch{return false}
}
async function vpnControl(action,region){
 if(process.platform!=='win32')return {...await vpnReply(),error:'Activation intégrée actuellement disponible sur Windows uniquement.'};
 const exe=wireguardExe();
 if(!exe)return {...await vpnReply(),error:'Installez WireGuard pour Windows depuis le bouton Installer WireGuard.'};
 if(!vpnRegions.includes(region))return {...await vpnReply(),error:'Région non reconnue'};
 if(action==='connect'&&!fs.existsSync(vpnFile(region)))return {...await vpnReply(),error:'Importez un profil WireGuard valide pour cette région.'};
 try{
  if(action==='connect'){
   for(const other of vpnRegions){
    if(other!==region&&await vpnService(other))await run(exe,['/uninstalltunnelservice',vpnTunnel(other)],{timeout:15000,windowsHide:true});
   }
   if(!await vpnService(region))await run(exe,['/installtunnelservice',vpnFile(region)],{timeout:20000,windowsHide:true});
  }else{
   if(await vpnService(region))await run(exe,['/uninstalltunnelservice',vpnTunnel(region)],{timeout:15000,windowsHide:true});
  }
  const running=await vpnService(region);
  const status=await vpnReply();
  return {...status,serviceRunning:running,message:running?'Tunnel WireGuard démarré. Vérifiez maintenant IP publique, pays et DNS.':'Tunnel WireGuard arrêté. La connexion réseau peut utiliser une autre interface.'};
 }catch(e){
  return {...await vpnReply(),error:'Commande WireGuard refusée ou échouée. Lancez CMD Browser en administrateur et vérifiez votre profil et le service WireGuard.'};
 }
}
ipcMain.handle('cmd:vpn',async(_event,action,region)=>{
 if(action==='status')return await vpnReply();
 if(action==='regions')return vpnRegions;
 if(action==='connect')return await vpnControl('connect',region);
 if(action==='disconnect'){
  if(region&&vpnRegions.includes(region))return await vpnControl('disconnect',region);
  for(const item of vpnRegions)if(await vpnService(item))return await vpnControl('disconnect',item);
  return await vpnReply();
 }
 if(action==='import'){
  if(!vpnRegions.includes(region))return {...await vpnReply(),error:'Choisissez une région valide'};
  const picked=await dialog.showOpenDialog(main,{title:'Importer un profil WireGuard',properties:['openFile'],filters:[{name:'WireGuard',extensions:['conf']}]});
  if(picked.canceled||!picked.filePaths[0])return await vpnReply();
  const content=fs.readFileSync(picked.filePaths[0],'utf8');
  if(content.length>32768||!/^\s*\[Interface\]/m.test(content)||!/^\s*\[Peer\]/m.test(content)||!/^\s*PrivateKey\s*=/m.test(content)||!/^\s*Endpoint\s*=/m.test(content))
   return {...await vpnReply(),error:'Profil WireGuard incomplet : Interface, PrivateKey, Peer et Endpoint nécessaires'};
  fs.mkdirSync(vpnDir(),{recursive:true,mode:0o700});
  fs.writeFileSync(vpnFile(region),content,{mode:0o600});
  return {...await vpnReply(),message:'Profil importé. Vous pouvez maintenant demander l’activation sous Windows (droits administrateur requis).'};
 }
 if(action==='open-client'){await shell.openExternal('https://www.wireguard.com/install/');return await vpnReply()}
 return await vpnReply();
});
