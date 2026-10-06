import Shell from '../../components/Shell';
import ModuleEditor from '../../components/ModuleEditor';
import {readPageDb} from '../../lib/db';

const kindLabel={rp:'RP',server:'Serveur',admin:'Admin',emergency:'Urgence'};
export default async function RadioPage(){
  const db=await readPageDb();
  const history=(db.radioBroadcasts||[]).slice().sort((a,b)=>Date.parse(b.emittedAt||0)-Date.parse(a.emittedAt||0)).slice(0,100);
  return <Shell>
    <div className="mb-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-purple-300">Réseau radio</p>
      <h2 className="text-4xl font-black">Radio & messages récurrents</h2>
      <p className="mt-2 max-w-3xl text-white/65">Crée une station, choisis une fréquence, publie des messages RP ou serveur et programme leur répétition. Si un salon Discord est renseigné, chaque diffusion peut aussi y être relayée.</p>
    </div>

    <div className="card mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Dernières émissions</p>
          <h3 className="text-2xl font-black">Flux radio EXTINCTION ++ RSS</h3>
        </div>
        <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">Multi-jeu</span>
      </div>
      <div className="mt-4 space-y-3">
        {history.map(x=><article key={x.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/50">
            <b className="text-purple-300">{x.station||'Radio'}</b>
            <span>{x.frequency||'Fréquence libre'}</span>
            <span>•</span>
            <span>{kindLabel[x.kind]||x.kind||'Message'}</span>
            {x.game&&<><span>•</span><span>{x.game}</span></>}
            <span className="ml-auto">{x.emittedAt?new Date(x.emittedAt).toLocaleString('fr-FR'):'—'}</span>
          </div>
          {x.title&&<h4 className="mt-2 text-lg font-black">{x.title}</h4>}
          <p className="mt-1 whitespace-pre-wrap text-white/80">{x.message}</p>
        </article>)}
        {!history.length&&<p className="text-white/50">Aucune émission pour le moment.</p>}
      </div>
    </div>

    <ModuleEditor
      title="Stations et messages"
      endpoint="/api/radio"
      fields={[
        {name:'station',label:'Nom de station',required:true},
        {name:'frequency',label:'Fréquence (ex. 87.6 MHz)'},
        {name:'title',label:'Titre'},
        {name:'message',label:'Message',required:true},
        {name:'kind',label:'Type',options:{rp:'RP / ambiance',server:'Info serveur',admin:'Annonce admin',emergency:'Urgence'},required:true},
        {name:'game',label:'Jeu'},
        {name:'serverId',label:'ID serveur (facultatif)'},
        {name:'channelId',label:'ID salon Discord (facultatif)'},
        {name:'nextRunAt',label:'Prochaine diffusion (ISO avec fuseau)',required:true},
        {name:'intervalMinutes',label:'Répétition en minutes (0 = une fois)',type:'integer'},
        {name:'enabled',label:'Activé',type:'boolean'}
      ]}
    />
  </Shell>;
}
