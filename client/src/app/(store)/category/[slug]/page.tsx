import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { tr } from '@/lib/format';
import { ShopView, type SP } from '@/components/shop/ShopView';
import { PageHeader } from '@/components/shop/PageHeader';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateStaticParams() {
  const cats = await api.categories();
  return (cats ?? []).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await getI18n();
  const c = await api.category(slug);
  if (!c) return { title: 'Not found' };
  const sp = await searchParams;
  return {
    title: `${tr(c.name, lang)} — ${lang === 'bn' ? 'অনলাইনে কিনুন' : 'Shop online in Bangladesh'}`,
    description: tr(c.description, lang),
    alternates: { canonical: `/category/${slug}` },
    openGraph: { images: [{ url: c.image, width: 1200, height: 1500 }] },
    robots: Object.keys(sp).some((k) => k !== 'page') ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp, { t, lang }] = await Promise.all([params, searchParams, getI18n()]);
  const c = await api.category(slug);
  if (!c) notFound();
  return (
    <ShopView
      sp={sp}
      base={`/category/${slug}`}
      lockCategory={slug}
      header={
        <PageHeader
          crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.shop'), href: '/shop' }, { name: tr(c.name, lang) }]}
          eyebrow={lang === 'bn' ? 'কালেকশন' : 'Collection'}
          title={tr(c.name, lang)}
          sub={tr(c.description, lang)}
          aside={
            <div className="arch relative hidden aspect-[3/4] w-40 shrink-0 overflow-hidden md:block lg:w-48">
              <Image src={c.image} alt={tr(c.name, lang)} fill priority sizes="192px" className="object-cover" />
            </div>
          }
        />
      }
    />
  );
}
