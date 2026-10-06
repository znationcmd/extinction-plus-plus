'use client';
import {useParams} from 'next/navigation';
import ModuleEditor from '../../../components/ModuleEditor';

const labels={
  messages:'Messages',
  welcome:'Arrivées et départs',
  autoroles:'Rôles automatiques',
  verification:'Vérification',
  levels:'Niveaux',
  invitations:'Invitations',
  reputation:'Réputation',
  tempvoice:'Salons vocaux temporaires',
  infinity:"Route de l’Infini",
  suggestions:'Suggestions',
  secureroles:'Rôles sécurisés',
  moderation:'Modération',
  automod:'Auto-Modération',
  reports:'Signalements',
  giveaways:'Lots & Giveaways',
  polls:'Sondages',
  embeds:'Embeds',
  snippets:'Snippets',
  social:'Notifications sociales',
  recurring:'Messages récurrents',
  statschannels:'Salons de statistiques',
  counters:'Compteurs',
  birthdays:'Anniversaires',
  customcommands:'Commandes personnalisées',
  wordreactions:'Réactions de mots',
  starboard:'Starboards',
  reactionroles:'Rôles-Réactions'
};

export default function DiscordModulePage(){
  const params=useParams();
  const key=String(params?.key||'');
  const title=labels[key]||'Module Discord';
  return <div className="space-y-5">
    <div>
      <p className="text-xs font-black uppercase tracking-[.18em] text-purple-300/70">Discord · module</p>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-white/60">Configuration propre au Discord actuellement sélectionné. Aucun autre module existant n’est supprimé.</p>
    </div>
    <ModuleEditor
      endpoint={'/api/discord-modules?key='+encodeURIComponent(key)}
      title={title}
      fields={[
        {name:'name',label:'Nom du module',type:'text',required:true},
        {name:'enabled',label:'Activé',type:'boolean',defaultValue:true},
        {name:'channelId',label:'ID du salon Discord',type:'text'},
        {name:'roleIds',label:'IDs des rôles autorisés (séparés par des virgules)',type:'strings'},
        {name:'message',label:'Message / texte du module',type:'text'},
        {name:'config',label:'Configuration avancée',type:'text'}
      ]}
    />
  </div>;
}
