import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { JOURNAL } from '@/content/site';
import { getI18n } from '@/i18n/server';
import { SITE_URL } from '@/lib/config';
import { dateFmt, tr } from '@/lib/format';
import { Breadcrumbs } from '@/components/shop/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { LotusMark } from '@/components/ui/Logo';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => JOURNAL.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = JOURNAL.find((x) => x.slug === slug);
  const { lang } = await getI18n();
  return a ? { title: tr(a.title, lang), description: tr(a.excerpt, lang), alternates: { canonical: `/journal/${slug}` }, openGraph: { type: 'article', images: [a.image], publishedTime: a.date } } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = JOURNAL.find((x) => x.slug === slug);
  if (!a) notFound();
  const { t, lang } = await getI18n();
  return (
    <article className="pb-20">
      <div className="container-x max-w-3xl pt-6">
        <Breadcrumbs crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.journal'), href: '/journal' }, { name: tr(a.title, lang) }]} />
        <div className="stagger mt-10 text-center">
          <p className="eyebrow">{dateFmt(a.date, lang)} · {a.minutes} min</p>
          <h1 className="h-display mt-4 text-[44px] sm:text-[68px]">{tr(a.title, lang)}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-mocha">{tr(a.excerpt, lang)}</p>
        </div>
      </div>
      <div className="container-x mt-10 max-w-5xl">
        <div className="media relative aspect-[16/9] overflow-hidden rounded-[32px]">
          <Image src={a.image} alt="" fill priority sizes="(max-width:1100px) 100vw, 1024px" className="object-cover" />
        </div>
      </div>
      <div className="container-x mt-12 max-w-2xl space-y-6 text-[17px] leading-[1.8]">
        {a.body.map((p, i) => <p key={i} data-reveal className={i === 0 ? 'first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-bronze' : ''}>{tr(p, lang)}</p>)}
        <LotusMark className="mx-auto mt-10 h-10 w-10 text-gold" />
        <Link href="/journal" className="btn-ghost mx-auto mt-6 flex w-fit"><ArrowLeft className="h-4 w-4" /> {t('nav.journal')}</Link>
      </div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title.en, description: a.excerpt.en, image: [a.image], datePublished: a.date, author: { '@type': 'Organization', name: 'Ruposhi' }, publisher: { '@type': 'Organization', name: 'Ruposhi', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` } }, mainEntityOfPage: `${SITE_URL}/journal/${a.slug}` }} />
    </article>
  );
}
