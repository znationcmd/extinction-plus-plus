function localAiAnswer(message) {
  const q = String(message || '').toLowerCase();
  if (q.includes('nitrado')) return 'Nitrado : configure ton token, puis teste /nitrado test et /nitrado services. Ajoute le service ID dans Owner Config ou /serveur ajouter.';
  if (q.includes('rcon') || q.includes('gportal')) return 'RCON/GPortal : active RCON chez l’hébergeur, copie host, port et mot de passe, puis teste /rcon test.';
  if (q.includes('whitelist') || q.includes('whiltliste')) return 'Whitelist : crée un panneau avec /whitelist-panel. Les joueurs cliquent et les admins valident.';
  if (q.includes('shop')) return 'Shop : /shop create pour créer, /shop list pour voir, /shop buy pour acheter. Le dashboard Shop affiche les items.';
  if (q.includes('banque') || q.includes('bank')) return 'Banque : /bank solde, /bank pay, /bank add. Le dashboard Économie affiche comptes et transactions.';
  if (q.includes('rp')) return 'RP : la page RP gère métiers, licences, amendes, mandats, entreprises, propriétés et salaires.';
  if (q.includes('interpol')) return 'INTERPOL : /interpol signaler pour créer un dossier. La page INTERPOL centralise les signalements.';
  return 'Je peux aider sur Nitrado, RCON/GPortal, whitelist, shop, banque, RP, INTERPOL, killfeed, Battle Pass et dashboard.';
}

export async function POST(req) {
  const { message } = await req.json();
  return Response.json({ answer: localAiAnswer(message) });
}
