"use client";
import Link from 'next/link';
import { links } from './Shell';
import { useLanguage } from './LanguageProvider';
export default function ModuleGrid() {
  const { t } = useLanguage();
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {links.filter(([href]) => href !== '/').map(([href, label, Icon]) => (
      <Link key={href} href={href} prefetch={false} className="flex min-h-[120px] flex-col items-center justify-center rounded-3xl bg-white/10 p-5 text-center hover:bg-white/15 active:bg-red-600">
        <Icon size={34} /><span className="mt-3 text-lg font-bold">{t(label)}</span>
      </Link>
    ))}
  </div>;
}
