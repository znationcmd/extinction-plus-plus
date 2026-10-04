'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Context = createContext({ installed: false, ios: false, prompt: null, secure: true });
export function usePwa() { return useContext(Context); }

export default function PwaProvider({ children }) {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [secure, setSecure] = useState(true);
  const [offline, setOffline] = useState(false);
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
        .then(registration => registration.update())
        .catch(() => {});
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', appInstalled);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', disconnected);
      standalone.removeEventListener('change', checkInstalled);
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
  return <Context.Provider value={{ installed, ios, prompt, secure, install }}>
    {children}
    {offline && <div role="status" className="fixed left-3 right-3 top-3 z-[70] rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-black shadow-xl">Connexion perdue. Les actions sur tes serveurs nécessitent Internet.</div>}
  </Context.Provider>;
}
