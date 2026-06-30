import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function EconomyPage() {
  const db = readDb();
  const transactions = db.economy?.transactions || [];
  const accounts = db.bank?.accounts || [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Économie & Banque</h2>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="card"><h3 className="text-2xl font-black">Transactions</h3><p className="text-4xl font-black">{transactions.length}</p></div>
        <div className="card"><h3 className="text-2xl font-black">Comptes banque</h3><p className="text-4xl font-black">{accounts.length}</p></div>
        <div className="card"><h3 className="text-2xl font-black">Shop orders</h3><p className="text-4xl font-black">{(db.shopPurchases || []).length}</p></div>
      </div>
      <div className="card mt-6">
        <h3 className="mb-4 text-2xl font-black">Historique</h3>
        <div className="space-y-3">
          {transactions.map(t => <div key={t.id || JSON.stringify(t)} className="rounded-2xl bg-black/30 p-4">{t.userId} — {t.amount} — {t.reason}</div>)}
          {!transactions.length && <p>Aucune transaction.</p>}
        </div>
      </div>
    </Shell>
  );
}
