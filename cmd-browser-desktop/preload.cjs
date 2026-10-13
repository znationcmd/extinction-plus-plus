const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cmdDesktop',{home:()=>ipcRenderer.invoke('cmd:home')});
