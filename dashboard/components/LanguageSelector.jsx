"use client";
import { languages, useLanguage } from './LanguageProvider';
export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return <label className="flex items-center gap-2 text-sm text-white/80">
    <span>{t('Langue')}</span>
    <select aria-label={t('Langue')} value={language} onChange={event => setLanguage(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-white/20 bg-[#08111f] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400">
      {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  </label>;
}
