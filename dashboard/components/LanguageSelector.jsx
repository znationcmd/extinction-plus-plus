"use client";
import { useEffect, useMemo, useState } from 'react';
import { languages, useLanguage } from './LanguageProvider';
const VALID = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false), [search, setSearch] = useState('');
  const [list, setList] = useState(languages), [custom, setCustom] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || list.length > 50 || loading) return;
    let alive = true;
    setLoading(true);
    fetch('/cmd-world-languages.json', {cache:'force-cache'})
      .then(r => { if (!r.ok) throw Error('Catalogue indisponible'); return r.json(); })
      .then(d => { if (alive && Array.isArray(d.languages) && d.languages.length > 7000) setList(d.languages); })
      .catch(e => { if (alive) setError('Catalogue non chargé : ' + e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, list.length, loading]);
  const filtered = useMemo(() => {
    const term = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
    const hits = list.filter(([code,name]) => !term || (code+' '+name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().includes(term));
    return hits.slice(0,80);
  }, [list, search]);
  function select(code) {
    setLanguage(code);setOpen(false);setSearch('');setError('');
  }
  function enterCustom(event) {
    event.preventDefault();
    const code = custom.trim();
    if (!VALID.test(code) || code.length > 64) {setError('Code BCP 47 invalide : exemple gsw-CH-x-bern');return;}
    try {
      const normalized = Intl.getCanonicalLocales(code)[0];
      if (!normalized) throw Error('Code inconnu');
      select(normalized);
    } catch {setError('Code de langue non reconnu.');}
  }
  const label = list.find(([code]) => code === language)?.[1] || languages.find(([code]) => code === language)?.[1] || language;
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Choisir une langue ou un dialecte"
      className="min-h-11 max-w-[170px] truncate rounded-xl border border-white/20 bg-[#08111f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-400">
      🌐 {label}
    </button>
    {open && <div role="presentation" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label="Choisir ma langue" className="flex max-h-[85dvh] w-full max-w-xl flex-col gap-3 overflow-hidden rounded-2xl border border-violet-400/40 bg-[#0c1024] p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Langues et dialectes du monde</h2><button type="button" aria-label="Fermer" onClick={()=>setOpen(false)} className="rounded-lg border px-3 py-1">✕</button></div>
        <p className="text-xs text-white/70">8 148 langues et variantes référencées. La traduction des interfaces dépend de la disponibilité des traductions ; le suisse allemand peut utiliser l’allemand standard.</p>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} autoFocus
          placeholder="Rechercher : suisse allemand, bernois, corsu, gsw-CH"
          aria-label="Rechercher une langue ou un patois"
          className="min-h-11 w-full rounded-lg border border-white/30 bg-slate-900 px-3 py-2 text-white" />
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/20" role="listbox" aria-label="Résultats des langues">
          {filtered.map(([code,name]) => <button type="button" role="option" aria-selected={language===code}
            key={code} onClick={()=>select(code)}
            className={'block w-full border-b border-white/10 px-3 py-2 text-left text-sm hover:bg-violet-800/50 '+(language===code?'bg-violet-900/40':'')}>
             {name} <span className="text-xs text-white/55">({code})</span></button>)}
          {!filtered.length && <p className="p-3 text-sm">Aucune entrée correspondante.</p>}
        </div>
        <p className="text-xs text-white/60">80 résultats affichés à la fois. Précise la recherche pour retrouver un dialecte.</p>
        <form onSubmit={enterCustom} className="flex flex-wrap items-center gap-2">
          <input value={custom} onChange={e=>setCustom(e.target.value)} maxLength={64} placeholder="Code régional : gsw-CH-x-bern"
            aria-label="Code régional BCP 47 personnalisé" className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/30 bg-slate-900 px-3 text-white"/>
          <button type="submit" className="min-h-11 rounded-lg bg-violet-700 px-3 font-semibold">Appliquer</button>
        </form>
        {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
      </section>
    </div>}
  </>;
}
