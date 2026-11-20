import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POLICIES } from '@/content/site';
import { getI18n } from '@/i18n/server';
import { cn, tr } from '@/lib/format';
import { PageHeader } from '@/components/shop/PageHeader';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(POLICIES).map((slug) => ({ slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICIES[slug];
  const { lang } = await getI18n();
  return p ? { title: tr(p.title, lang), description: tr(p.intro, lang), alternates: { canonical: `/policies/${slug}` } } : {};
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const p = POLICIES[slug];
  if (!p) notFound();
  const { t, lang } = await getI18n();
  return (
    <div className="container-x pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: tr(p.title, lang) }]} title={tr(p.title, lang)} sub={tr(p.intro, lang)} />
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start" aria-label="Policies">
          {Object.entries(POLICIES).map(([k, v]) => (
            <Link key={k} href={`/policies/${k}`} className={cn('chip shrink-0 lg:justify-start', k === slug && 'chip-on')}>{tr(v.title, lang)}</Link>
          ))}
        </nav>
        <article className="max-w-2xl space-y-8">
          {p.blocks.map((b, i) => (
            <section key={i} data-reveal>
              {b.h && <h2 className="font-display text-3xl">{tr(b.h, lang)}</h2>}
              {b.p.map((x, j) => <p key={j} className="mt-3 text-[16px] leading-relaxed text-mocha">{tr(x, lang)}</p>)}
            </section>
          ))}
          <p className="rounded-2xl bg-sand p-5 text-sm">{lang === 'bn' ? 'আরও প্রশ্ন? ' : 'More questions? '}<Link href="/contact" className="btn-link">{t('nav.contact')}</Link></p>
        </article>
      </div>
    </div>
  );
}
