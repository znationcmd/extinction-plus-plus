"use client";
import Link from 'next/link';
import { links } from './Shell';
import { useLanguage } from './LanguageProvider';

export default function ModuleGrid() {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {links.filter(([href]) => href !== '/').map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className="group flex aspect-square min-h-0 flex-col items-center justify-center rounded-2xl border border-purple-400/20 bg-black/45 p-3 text-center shadow-[0_10px_30px_rgba(0,0,0,.25)] backdrop-blur-md transition hover:-translate-y-1 hover:border-purple-400/45 hover:bg-purple-950/45 active:scale-[.98] active:bg-purple-900"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-purple-300 transition group-hover:bg-purple-500/20">
            <Icon size={30}/>
          </div>
          <span className="mt-3 line-clamp-2 text-[13px] font-black leading-tight sm:text-sm">{t(label)}</span>
        </Link>
      ))}
    </div>
  );
}
