'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import { usePwa } from '../../components/PwaProvider';

export default function Page() {
  const { installed, ios, prompt, secure, install } = usePwa();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function startInstall() {
    setPending(true); setMessage('');
    try { if (!(await install())) setMessage('Tu peux relancer l’installation depuis le menu de ton navigateur.'); }
    catch { setMessage('Ouvre le Dashboard dans Safari ou Chrome, puis utilise le menu pour l’ajouter à ton écran d’accueil.'); }
    finally { setPending(false); }
  }
  return <Shell>
    <section className="card mb-6 flex flex-col items-center gap-4 text-center sm:p-10">
      <img src="/app-icons/icon-192.png" width="96" height="96" alt="Extinction++" className="rounded-3xl shadow-2xl" />
      <h2 className="text-3xl font-black sm:text-4xl">Extinction++ sur ton téléphone</h2>
      <p className="max-w-xl text-white/70">Installe le Dashboard gratuitement. Retrouve tes serveurs, les mises à jour des mods DayZ et le validateur JSON/XML depuis ton écran d’accueil.</p>
      {installed ? <><p className="font-bold text-green-300">✅ Extinction++ est installé</p><Link href="/" className="btn bg-purple-600">Ouvrir le Dashboard</Link></> : prompt ? <button className="btn bg-purple-600 disabled:opacity-50" disabled={pending} onClick={startInstall}>{pending ? 'Installation…' : 'Installer Extinction++'}</button> : <p className="rounded-2xl bg-purple-500/15 p-4 text-purple-200">{ios ? 'Sur iPhone, utilise le menu Partager de Safari pour installer l’application.' : 'Pour installer l’application, utilise le menu de Chrome ou de ton navigateur.'}</p>}
      {!secure && <p className="text-amber-200">Ouvre l’adresse HTTPS du Dashboard pour permettre l’installation.</p>}
      {message && <p role="status">{message}</p>}
    </section>
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card"><h3 className="mb-4 text-2xl font-black">iPhone / iPad</h3><ol className="list-decimal space-y-3 pl-5"><li>Ouvre ce Dashboard dans <b>Safari</b>.</li><li>Ouvre le menu puis touche <b>Partager</b>.</li><li>Choisis <b>Sur l’écran d’accueil</b> ou <b>Ajouter à l’écran d’accueil</b>.</li><li>Active <b>Ouvrir comme app web</b> si cette option apparaît, puis touche <b>Ajouter</b>.</li></ol></section>
      <section className="card"><h3 className="mb-4 text-2xl font-black">Android</h3><ol className="list-decimal space-y-3 pl-5"><li>Ouvre ce Dashboard dans <b>Chrome</b>.</li><li>Touche <b>Installer Extinction++</b> si le bouton apparaît.</li><li>Sinon, ouvre le menu <b>⋮</b>, puis <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.</li><li>Confirme l’installation.</li></ol></section>
    </div>
    <section className="card mt-6 space-y-3"><h3 className="text-2xl font-black">Toujours relié à ton bot</h3><p className="text-white/70">L’application utilise ton Dashboard et les mêmes accès Discord. Connecte-toi dans l’application pour utiliser les outils des fondateurs. Les mises à jour du site s’appliquent sans téléchargement sur un store.</p><p className="text-white/60">L’installation n’ajoute aucun abonnement. L’hébergement actuel du bot et du Dashboard conserve son coût. Une connexion Internet est nécessaire pour afficher les données et gérer les serveurs.</p><div className="flex flex-wrap gap-3 pt-2"><Link href="/dayz-mods" className="btn bg-white/10">Mods DayZ PC</Link><Link href="/file-validator" className="btn bg-white/10">Validateur JSON / XML</Link></div></section>
  </Shell>;
}
