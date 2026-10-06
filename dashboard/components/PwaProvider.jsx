'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const Context = createContext({ installed: false, ios: false, prompt: null, secure: true, refreshApp: async()=>{} });
export function usePwa() { return useContext(Context); }

export default function PwaProvider({ children }) {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [secure, setSecure] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const registrationRef=useRef(null);
  const reloadingRef=useRef(false);

  async function checkUpdate(forceReload=false){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return false;
    try{
      const registration=registrationRef.current || await navigator.serviceWorker.getRegistration('/');
      if(!registration){if(forceReload)window.location.reload();return false}
      registrationRef.current=registration;
      await registration.update();
      if(registration.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return true}
      if(forceReload)window.location.reload();
      return false;
    }catch{if(forceReload)window.location.reload();return false}
  }
  async function refreshApp(){
    setRefreshing(true);
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>k.startsWith('extinction-pwa-')).map(k=>caches.delete(k)));
      }
      await checkUpdate(true);
    }finally{setTimeout(()=>setRefreshing(false),1200)}
  }

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const checkInstalled = () => setInstalled(standalone.matches || window.navigator.standalone === true);
    checkInstalled();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setSecure(window.isSecureContext);
    setOffline(!navigator.onLine);
    const beforeInstall = event => { event.preventDefault(); setPrompt(event); };
    const appInstalled = () => { setInstalled(true); setPrompt(null); };
    const online = () => { setOffline(false); checkUpdate(false); };
    const disconnected = () => setOffline(true);
    const focus=()=>checkUpdate(false);
    const visibility=()=>{if(document.visibilityState==='visible')checkUpdate(false)};
    const controllerChange=()=>{if(reloadingRef.current)return;reloadingRef.current=true;window.location.reload()};

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    window.addEventListener('online', online);
    window.addEventListener('offline', disconnected);
    window.addEventListener('focus',focus);
    document.addEventListener('visibilitychange',visibility);
    standalone.addEventListener('change', checkInstalled);

    let interval;
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener('controllerchange',controllerChange);
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(registration => {
          registrationRef.current=registration;
          registration.addEventListener('updatefound',()=>{
            const sw=registration.installing;if(!sw)return;
            sw.addEventListener('statechange',()=>{if(sw.state==='installed'&&navigator.serviceWorker.controller)sw.postMessage({type:'SKIP_WAITING'})});
          });
          return registration.update();
        }).catch(() => {});
      interval=setInterval(()=>checkUpdate(false),10*60*1000);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', appInstalled);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('focus',focus);
      document.removeEventListener('visibilitychange',visibility);
      standalone.removeEventListener('change', checkInstalled);
      navigator.serviceWorker?.removeEventListener?.('controllerchange',controllerChange);
      if(interval)clearInterval(interval);
    };
  }, []);
  async function install() {
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      return choice.outcome === 'accepted';
    } finally { setPrompt(null); }
  }
  return <Context.Provider value={{ installed, ios, prompt, secure, install, refreshApp }}>
    {children}
    <button type="button" onClick={refreshApp} disabled={refreshing} aria-label="Actualiser et vérifier les mises à jour" title="Actualiser / vérifier les mises à jour" className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[80] grid h-12 w-12 place-items-center rounded-2xl border border-purple-400/50 bg-black/85 text-2xl font-black text-white shadow-2xl backdrop-blur-xl disabled:opacity-50">{refreshing?'…':'↻'}</button>
    {offline && <div role="status" className="fixed left-3 right-3 top-3 z-[70] rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-black shadow-xl">Connexion perdue. Les actions sur tes serveurs nécessitent Internet.</div>}
  </Context.Provider>;
}
