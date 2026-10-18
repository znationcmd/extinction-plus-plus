"use client";
import { Globe, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { languages, useLanguage } from './LanguageProvider';
const VALID = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false), [search, setSearch] = useState('');
  const [list, setList] = useState(languages), [custom, setCustom] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [expandedLetter, setExpandedLetter] = useState('');
  const requested = useRef(false);
  useEffect(() => {
    if (!open || requested.current) return;
    requested.current = true;
    let alive = true;
    setLoading(true);
    fetch('/cmd-world-languages.json', {cache:'force-cache'})
      .then(r => { if (!r.ok) throw Error('Catalogue indisponible'); return r.json(); })
      .then(d => { if (alive && Array.isArray(d.languages) && d.languages.length > 7000) setList(d.languages); })
      .catch(e => { if (alive) setError('Catalogue non chargé : ' + e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]);
  const filtered = useMemo(() => {
    const term = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
    return list.filter(([code,name]) => !term || (code+' '+name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().includes(term));
  }, [list, search]);
  const groups = useMemo(() => {
    const buckets = new Map();
    for (const [code,name] of filtered) {
      const initial = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(initial) ? initial : '#';
      if (!buckets.has(letter)) buckets.set(letter, []);
      buckets.get(letter).push([code,name]);
    }
    return [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'].filter(letter=>buckets.has(letter)).map(letter=>[letter,buckets.get(letter)]);
  }, [filtered]);
  function select(code) {
    setLanguage(code);setOpen(false);setSearch('');setExpandedLetter('');setError('');
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
      <Globe className="inline-block mr-2" size={18} aria-hidden="true"/> {label}
    </button>
    {open && <div role="presentation" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label="Choisir ma langue" className="flex max-h-[85dvh] w-full max-w-xl flex-col gap-3 overflow-hidden rounded-2xl border border-violet-400/40 bg-[#0c1024] p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Langues et dialectes du monde</h2><button type="button" aria-label="Fermer" onClick={()=>setOpen(false)} className="rounded-lg border px-3 py-1"><X size={18} aria-hidden="true"/></button></div>
        <p className="text-xs text-white/70">8 148 langues et variantes référencées. La traduction des interfaces dépend de la disponibilité des traductions ; le suisse allemand peut utiliser l’allemand standard.</p>
        <input type="search" value={search} onChange={e=>{setSearch(e.target.value);setExpandedLetter('')}} autoFocus
          placeholder="Rechercher : suisse allemand, bernois, corsu, gsw-CH"
          aria-label="Rechercher une langue ou un patois"
          className="min-h-11 w-full rounded-lg border border-white/30 bg-slate-900 px-3 py-2 text-white" />
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/20" role="group" aria-label="Langues classées de A à Z">
          {groups.map(([letter,entries])=><div key={letter} className="border-b border-white/15">
            <button type="button" aria-expanded={expandedLetter===letter} onClick={()=>setExpandedLetter(v=>v===letter?'':letter)}
              className="flex min-h-12 w-full items-center justify-between bg-violet-900/20 px-4 text-left font-bold hover:bg-violet-800/40">
              <span>{letter==='#'?'Autres':letter}</span><span className="text-xs font-normal text-white/70">{entries.length} langues {expandedLetter===letter?'⌃':'⌄'}</span>
            </button>
            {expandedLetter===letter&&<div role="listbox" aria-label={'Langues en '+letter}>
              {entries.map(([code,name])=><button type="button" role="option" aria-selected={language===code}
                key={code} onClick={()=>select(code)}
                className={'block min-h-10 w-full border-b border-white/10 px-5 py-2 text-left text-sm hover:bg-violet-800/50 '+(language===code?'bg-violet-900/40':'')}>
                {name} <span className="text-xs text-white/55">({code})</span>
              </button>)}
            </div>}
          </div>)}
          {!groups.length && <p className="p-3 text-sm">Aucune entrée correspondante.</p>}
        </div>
        <p className="text-xs text-white/60">{filtered.length.toLocaleString('fr-FR')} entrées disponibles. Appuie sur une lettre pour déplier toutes ses langues.</p>
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
