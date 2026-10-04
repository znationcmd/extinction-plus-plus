import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default async function RpPage() {
  const db = (await readDb());
  const rp = db.rp || {};
  const jobs = rp.jobs || [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Système RP</h2>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="card"><h3 className="text-2xl font-black">Métiers</h3><p>Police, SAMU, Pompiers, Justice, Gouvernement, Entreprises.</p></div>
        <div className="card"><h3 className="text-2xl font-black">Économie RP</h3><p>Salaires, taxes, amendes, licences, banque et transactions.</p></div>
        <div className="card"><h3 className="text-2xl font-black">Administration RP</h3><p>Casiers, mandats, propriétés, sociétés et permissions.</p></div>
      </div>
      <h3 className="mt-8 mb-4 text-3xl font-black">Métiers configurés</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {jobs.map(j => (
          <div key={j.id || j.name} className="card">
            <h4 className="text-xl font-black">{j.name}</h4>
            <p>Salaire : {j.salary || 0}</p>
            <p>Serveur : {j.serverId || 'Global'}</p>
          </div>
        ))}
        {!jobs.length && <div className="card md:col-span-3">Aucun métier RP configuré.</div>}
      </div>
    <ModuleEditor endpoint="/api/rp?collection=jobs" listKey="jobs" title="Métiers" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=licenses" listKey="licenses" title="Licences" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=fines" listKey="fines" title="Amendes" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=warrants" listKey="warrants" title="Mandats" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=companies" listKey="companies" title="Entreprises" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=properties" listKey="properties" title="Propriétés" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /><ModuleEditor endpoint="/api/rp?collection=salaries" listKey="salaries" title="Salaires" fields={[{name:"name",label:"Nom",required:true},{name:"userId",label:"ID joueur"},{name:"serverId",label:"Serveur"},{name:"salary",label:"Salaire",type:"integer"},{name:"amount",label:"Montant",type:"integer"},{name:"reason",label:"Motif"}]} /></Shell>
  );
}
