'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Context = createContext({ installed: false, ios: false, prompt: null, secure: true, refreshApp: async()=>{}, updateAvailable:false });
export function usePwa() { return useContext(Context); }

export default function PwaProvider({ children }) {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [secure, setSecure] = useState(true);
  const [offline, setOffline] = useState(false);
  const [registration,setRegistration]=useState(null);
  const [updateAvailable,setUpdateAvailable]=useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const checkInstalled = () => setInstalled(standalone.matches || window.navigator.standalone === true);
    checkInstalled();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setSecure(window.isSecureContext);
    setOffline(!navigator.onLine);
    const beforeInstall = event => { event.preventDefault(); setPrompt(event); };
    const appInstalled = () => { setInstalled(true); setPrompt(null); };
    const online = () => setOffline(false);
    const disconnected = () => setOffline(true);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    window.addEventListener('online', online);
    window.addEventListener('offline', disconnected);
    standalone.addEventListener('change', checkInstalled);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(reg => {setRegistration(reg);reg.addEventListener('updatefound',()=>{const sw=reg.installing;if(!sw)return;sw.addEventListener('statechange',()=>{if(sw.state==='installed'&&navigator.serviceWorker.controller){setUpdateAvailable(true);sw.postMessage({type:'SKIP_WAITING'});}})});return reg.update();})
        .catch(() => {});
      let reloading=false;
      const controllerChange=()=>{if(reloading)return;reloading=true;window.location.reload();};
      navigator.serviceWorker.addEventListener('controllerchange',controllerChange);
      const check=()=>navigator.serviceWorker.getRegistration('/').then(reg=>reg?.update()).catch(()=>{});
      const visible=()=>{if(document.visibilityState==='visible')check();};
      window.addEventListener('focus',check);
      document.addEventListener('visibilitychange',visible);
      const timer=setInterval(check,10*60*1000);
      return () => {navigator.serviceWorker.removeEventListener('controllerchange',controllerChange);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',visible);clearInterval(timer);window.removeEventListener('beforeinstallprompt', beforeInstall);window.removeEventListener('appinstalled', appInstalled);window.removeEventListener('online', online);window.removeEventListener('offline', disconnected);standalone.removeEventListener('change', checkInstalled);};
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', appInstalled);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', disconnected);
      standalone.removeEventListener('change', checkInstalled);
    };
  }, []);
  async function refreshApp() {
    try{
      const reg=registration||await navigator.serviceWorker?.getRegistration('/');
      if(reg){await reg.update();if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});return true;}}
    }catch{}
    window.location.reload();
    return true;
  }
  async function install() {
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      return choice.outcome === 'accepted';
    } finally { setPrompt(null); }
  }
  return <Context.Provider value={{ installed, ios, prompt, secure, install, refreshApp, updateAvailable }}>
    {children}
    {offline && <div role="status" className="fixed left-3 right-3 top-3 z-[70] rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-black shadow-xl">Connexion perdue. Les actions sur tes serveurs nécessitent Internet.</div>}
    <button type="button" onClick={refreshApp} className="fixed right-3 top-[calc(10px+env(safe-area-inset-top,0px))] z-[75] rounded-xl border border-purple-400/50 bg-black/85 px-3 py-2 text-sm font-black shadow-xl backdrop-blur lg:right-5 lg:top-5">↻ {updateAvailable?'Mettre à jour':'Actualiser'}</button>
  </Context.Provider>;
}
