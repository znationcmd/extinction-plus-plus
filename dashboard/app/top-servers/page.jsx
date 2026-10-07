'use client';
import {useEffect} from 'react';
import Shell from '../../components/Shell';

const CMD_TOP='https://cmd-top-serveur-production.up.railway.app/';

export default function TopServersPage(){
 useEffect(()=>{window.location.replace(CMD_TOP)},[]);
 return <Shell>
  <div className="card mx-auto max-w-3xl space-y-5 text-center">
   <p className="text-sm font-black uppercase tracking-[.24em] text-purple-300">Réseau CMD</p>
   <h2 className="text-4xl font-black">CMD Top Serveur</h2>
   <p className="text-white/60">Le classement commun de DAYZ GATE, BOT ARK et EXTINCTION ++ RSS est maintenant centralisé sur CMD Top Serveur.</p>
   <a className="btn btn-primary inline-flex" href={CMD_TOP}>Ouvrir CMD Top Serveur ↗</a>
  </div>
 </Shell>;
}
