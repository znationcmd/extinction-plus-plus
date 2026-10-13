const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cmdDesktop',{home:()=>ipcRenderer.invoke('cmd:home'),action:(name,value)=>ipcRenderer.invoke('cmd:action',name,value),onState:(callback)=>ipcRenderer.on('cmd:state',(_e,state)=>callback(state))});
