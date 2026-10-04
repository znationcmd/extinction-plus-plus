import Shell from '../../components/Shell';
import ExternalAdmin from '../../components/ExternalAdmin';
import ServerActions from '../../components/ServerActions';
export default function Integrations(){return <Shell><h2 className="mb-6 text-4xl font-black">Administration connectée</h2><section className="card mb-6"><h3 className="text-2xl font-black">Module serveur DayZ PC</h3><p className="my-3">Sources du module et agent compagnon : événements, positions et livraison d’objets ou de kits. À compiler avec DayZ Tools puis à valider sur un serveur de test. Un accès FTP seul ne suffit pas pour installer et lancer l’agent.</p><a className="btn btn-primary inline-block" href="/api/native-dayz">Télécharger les sources et le guide</a></section><ExternalAdmin/><ServerActions/></Shell>;}
