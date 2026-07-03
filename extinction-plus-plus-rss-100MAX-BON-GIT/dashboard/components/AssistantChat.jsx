'use client';
import { useState } from 'react';

export default function AssistantChat() {
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message }) });
      const data = await res.json();
      setAnswer(data.answer || 'Aucune réponse.');
    } catch {
      setAnswer('Erreur IA locale. Vérifie le dashboard.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="card">
    <h3 className="mb-3 text-2xl font-black">🤖 Assistant IA Extinction++ RSS</h3>
    <p className="mb-4 text-white/70">Pose une question si tu ne comprends pas Nitrado, RCON, whitelist, shop, banque, RP ou dashboard.</p>
    <form onSubmit={ask} className="space-y-3">
      <textarea className="w-full rounded-2xl bg-black/40 p-4 outline-none ring-1 ring-white/10 focus:ring-purple-500" rows="4" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ex: comment configurer RCON GPortal ?" />
      <button className="rounded-2xl bg-purple-600 px-5 py-3 font-bold" disabled={loading}>{loading ? 'Réponse...' : 'Demander à l’IA'}</button>
    </form>
    {answer && <div className="mt-4 rounded-2xl bg-black/40 p-4 whitespace-pre-wrap">{answer}</div>}
  </div>;
}
