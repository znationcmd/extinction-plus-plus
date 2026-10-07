'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const Context = createContext({
  installed:false, ios:false, prompt:null, secure:true,
  refreshing:false, refreshApp:async()=>{}, install:async()=>false
});
export function usePwa(){ return useContext(Context); }

const waitForInstalled=worker=>new Promise(resolve=>{
  if(!worker||worker.state==='installed'||worker.state==='activated')return resolve();
  const done=()=>{if(worker.state==='installed'||worker.state==='activated'||worker.state==='redundant'){worker.removeEventListener('statechange',done);resolve()}};
  worker.addEventListener('statechange',done);
  setTimeout(()=>{worker.removeEventListener('statechange',done);resolve()},8000);
});

export default function PwaProvider({children}){
  const [installed,setInstalled]=useState(false);
  const [ios,setIos]=useState(false);
  const [prompt,setPrompt]=useState(null);
  const [secure,setSecure]=useState(true);
  const [offline,setOffline]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const registrationRef=useRef(null);
  const reloadingRef=useRef(false);

  async function getRegistration(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return null;
    let registration=registrationRef.current||await navigator.serviceWorker.getRegistration('/');
    if(!registration){
      registration=await navigator.serviceWorker.register('/sw.js?v=5',{scope:'/',updateViaCache:'none'}).catch(()=>null);
    }
    if(registration)registrationRef.current=registration;
    return registration;
  }

  async function checkUpdate(forceReload=false){
    if(!navigator.onLine||!('serviceWorker' in navigator)||!window.isSecureContext){
      if(forceReload)window.location.reload();
      return false;
    }
    try{
      const registration=await getRegistration();
      if(!registration){if(forceReload)window.location.reload();return false}
      await registration.update();

      if(registration.installing)await waitForInstalled(registration.installing);
      const waiting=registration.waiting;
      if(waiting){
        waiting.postMessage({type:'SKIP_WAITING'});
        if(forceReload){
          setTimeout(()=>{if(!reloadingRef.current)window.location.reload()},1800);
        }
        return true;
      }
      if(forceReload)window.location.reload();
      return false;
    }catch{
      if(forceReload)window.location.reload();
      return false;
    }
  }

  async function refreshApp(){
    if(refreshing)return;
    setRefreshing(true);
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>k.startsWith('extinction-pwa-')).map(k=>caches.delete(k)));
      }
      await checkUpdate(true);
    }finally{
      setTimeout(()=>setRefreshing(false),1400);
    }
  }

  useEffect(()=>{
    const standalone=window.matchMedia('(display-mode: standalone)');
    const checkInstalled=()=>setInstalled(standalone.matches||window.navigator.standalone===true);
    checkInstalled();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
    setSecure(window.isSecureContext);
    setOffline(!navigator.onLine);

    const beforeInstall=e=>{e.preventDefault();setPrompt(e)};
    const appInstalled=()=>{setInstalled(true);setPrompt(null)};
    const online=()=>setOffline(false);
    const disconnected=()=>setOffline(true);
    const controllerChange=()=>{
      if(reloadingRef.current)return;
      try{
        const key='extinction-pwa-reloaded-v5';
        if(sessionStorage.getItem(key)==='1')return;
        sessionStorage.setItem(key,'1');
      }catch{}
      reloadingRef.current=true;
      window.location.reload();
    };

    window.addEventListener('beforeinstallprompt',beforeInstall);
    window.addEventListener('appinstalled',appInstalled);
    window.addEventListener('online',online);
    window.addEventListener('offline',disconnected);
    standalone.addEventListener('change',checkInstalled);

    let interval;
    if('serviceWorker' in navigator&&window.isSecureContext){
      navigator.serviceWorker.addEventListener('controllerchange',controllerChange);
      getRegistration().then(registration=>{
        if(!registration)return;
        registration.addEventListener('updatefound',()=>{
          const worker=registration.installing;
          if(!worker)return;
          worker.addEventListener('statechange',()=>{
            if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'});
          });
        });
        return registration.update();
      }).catch(()=>{});
      interval=null;
    }

    return()=>{
      window.removeEventListener('beforeinstallprompt',beforeInstall);
      window.removeEventListener('appinstalled',appInstalled);
      window.removeEventListener('online',online);
      window.removeEventListener('offline',disconnected);
      standalone.removeEventListener('change',checkInstalled);
      navigator.serviceWorker?.removeEventListener?.('controllerchange',controllerChange);
      if(interval)clearInterval(interval);
    };
  },[]);

  async function install(){
    if(!prompt)return false;
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      return choice.outcome==='accepted';
    }finally{setPrompt(null)}
  }

  return <Context.Provider value={{installed,ios,prompt,secure,install,refreshing,refreshApp}}>
    {children}
    {offline&&<div role="status" className="fixed left-3 right-3 top-3 z-[90] rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-black shadow-xl">Connexion perdue. Les actions sur tes serveurs nécessitent Internet.</div>}
  </Context.Provider>;
}
