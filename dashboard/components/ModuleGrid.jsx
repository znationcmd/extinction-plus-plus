"use client";
import Link from 'next/link';
import { links } from './Shell';
import { useLanguage } from './LanguageProvider';

export default function ModuleGrid() {
  const { t } = useLanguage();
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {links.filter(([href]) => href !== '/').map(([href, label, Icon]) => (
      <Link
        key={href}
        href={href}
        prefetch={false}
        className="ext-small-app flex min-h-[112px] flex-col items-center justify-center rounded-3xl bg-white/10 p-4 text-center hover:bg-white/15 active:bg-purple-800"
      >
        <Icon size={32}/>
        <span className="mt-2 text-[15px] font-bold leading-tight">{t(label)}</span>
      </Link>
    ))}
  </div>;
}
