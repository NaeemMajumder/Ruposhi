import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { JOURNAL } from '@/content/site';
import { getI18n } from '@/i18n/server';
import { dateFmt, tr } from '@/lib/format';
import { PageHeader } from '@/components/shop/PageHeader';

export const metadata: Metadata = { title: 'Journal', description: 'Stories of weaves, style guides and care notes from Ruposhi.', alternates: { canonical: '/journal' } };

export default async function JournalPage() {
  const { t, lang } = await getI18n();
  const [first, ...rest] = JOURNAL;
  return (
    <div className="container-x pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.journal') }]} eyebrow={t('nav.journal')} title={lang === 'bn' ? 'তাঁতের গল্প' : 'Stories from the loom'} />
      <Link href={`/journal/${first.slug}`} className="group grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="arch media relative aspect-[4/3] overflow-hidden lg:aspect-[5/4]">
          <Image src={first.image} alt="" fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover transition duration-1000 group-hover:scale-105" />
        </div>
        <div className="stagger">
          <p className="eyebrow">{dateFmt(first.date, lang)} · {first.minutes} min</p>
          <h2 className="h-display mt-3 text-[40px] sm:text-[56px]">{tr(first.title, lang)}</h2>
          <p className="mt-4 text-mocha">{tr(first.excerpt, lang)}</p>
          <span className="btn-link mt-6">{t('common.learnMore')} <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
        </div>
      </Link>
      <div className="mt-16 grid gap-8 sm:grid-cols-2">
        {rest.map((a) => (
          <Link key={a.slug} href={`/journal/${a.slug}`} className="group" data-reveal>
            <div className="media relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image src={a.image} alt="" fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover transition duration-1000 group-hover:scale-105" />
            </div>
            <p className="eyebrow mt-5">{dateFmt(a.date, lang)} · {a.minutes} min</p>
            <h2 className="mt-2 font-display text-3xl transition group-hover:text-bronze">{tr(a.title, lang)}</h2>
            <p className="mt-2 text-sm text-mocha">{tr(a.excerpt, lang)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
