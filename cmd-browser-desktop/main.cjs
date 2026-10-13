const {app,BrowserWindow,ipcMain,shell}=require('electron');
const path=require('node:path');
const HOME='https://cmd-browser-web-rzsb-production.up.railway.app';
let main;
function valid(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
function create(){main=new BrowserWindow({width:1280,height:850,minWidth:720,minHeight:500,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});main.loadFile('renderer.html');main.webContents.setWindowOpenHandler(({url})=>{if(valid(url))shell.openExternal(url);return {action:'deny'}})}
app.whenReady().then(()=>{create();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
ipcMain.handle('cmd:home',()=>HOME);
