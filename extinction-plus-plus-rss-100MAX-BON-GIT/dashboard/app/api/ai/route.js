function localAiAnswer(message) {
  const q = String(message || '').toLowerCase();
  if (q.includes('nitrado')) return 'Nitrado : configure ton token dans le dashboard, teste la connexion, puis lie ton service ID au serveur Discord.';
  if (q.includes('rcon') || q.includes('gportal')) return 'RCON/GPortal : active RCON chez l’hébergeur, copie host, port et mot de passe, puis teste la connexion.';
  if (q.includes('whitelist') || q.includes('whiltliste')) return 'Whitelist : crée un panneau whitelist, les joueurs font leur demande, puis le bot enregistre/valide selon ta configuration.';
  if (q.includes('shop')) return 'Shop : ajoute les items, prix et récompenses dans le dashboard, puis utilise la monnaie du bot pour acheter.';
  if (q.includes('rp')) return 'RP : la page RP gère métiers, licences, amendes, mandats, entreprises, propriétés et salaires.';
  if (q.includes('interpol')) return 'INTERPOL : dossiers joueurs, signalements, sanctions et historique d’actions staff.';
  return 'Je peux aider sur Nitrado, RCON, whitelist, shop, économie, RP, INTERPOL, killfeed, Battle Pass et dashboard.';
}

export async function POST(req) {
  const { message, system } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return Response.json({ answer: localAiAnswer(message), mode: 'local' });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system || 'Tu es l’assistant IA du dashboard Extinction++ RSS. Réponds en français, simplement, pour aider à configurer DayZ, Nitrado, Discord, RP, Interpol, whitelist, shop et Battle Pass.' },
          { role: 'user', content: String(message || '') }
        ],
        temperature: 0.3
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return Response.json({ answer: localAiAnswer(message), mode: 'fallback', error: err }, { status: 200 });
    }

    const data = await r.json();
    return Response.json({ answer: data.choices?.[0]?.message?.content || localAiAnswer(message), mode: 'openai' });
  } catch (e) {
    return Response.json({ answer: localAiAnswer(message), mode: 'fallback', error: String(e?.message || e) }, { status: 200 });
  }
}
