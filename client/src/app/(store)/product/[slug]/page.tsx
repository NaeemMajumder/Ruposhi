import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { SITE_URL } from '@/lib/config';
import { discountPct, money, tr } from '@/lib/format';
import { Breadcrumbs } from '@/components/shop/PageHeader';
import { Gallery } from '@/components/product/Gallery';
import { BuyBox } from '@/components/product/BuyBox';
import { Reviews } from '@/components/product/Reviews';
import { Accordion } from '@/components/product/Details';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { ProductRail } from '@/components/home/Sections';
import { ProductGrid } from '@/components/product/ProductCard';
import { JsonLd } from '@/components/seo/JsonLd';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateStaticParams() {
  const s = await api.slugs();
  return (s ?? []).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ lang }, p] = await Promise.all([getI18n(), api.product(slug)]);
  if (!p) return { title: 'Not found', robots: { index: false } };
  const title = p.seo?.title || `${tr(p.name, lang)} — ${money(p.price, 'en')}`;
  const description = p.seo?.description || tr(p.shortDescription, lang);
  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/product/${p.slug}`, images: p.images.slice(0, 4).map((i) => ({ url: i.url, width: 1200, height: 1500, alt: tr(i.alt, lang) })) },
    other: { 'product:price:amount': String(p.price), 'product:price:currency': 'BDT', 'product:availability': p.inStock ? 'in stock' : p.preOrder ? 'preorder' : 'out of stock' },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [{ t, lang }, p] = await Promise.all([getI18n(), api.product(slug)]);
  if (!p) notFound();
  const [rel, reviews, settings] = await Promise.all([api.related(slug), api.reviews(slug), api.settings()]);
  const name = tr(p.name, lang);
  const pct = discountPct(p.price, p.compareAtPrice ?? p.regularPrice);
  const badge = !p.inStock && !p.preOrder ? t('common.soldOut') : p.preOrder ? t('common.preOrder') : pct ? `−${pct}%` : p.isNewArrival ? t('common.new') : null;
  const d = settings?.delivery;

  return (
    <div className="container-x pb-10 pt-4 sm:pt-6">
      <Breadcrumbs className="mb-5 sm:mb-8" crumbs={[{ name: t('nav.home'), href: '/' }, { name: t(`nav.${p.category}`), href: `/category/${p.category}` }, { name }]} />
      <div className="grid gap-8 lg:grid-cols-[1.12fr_1fr] lg:gap-14 xl:gap-20">
        <div data-gallery>
          <Gallery p={p} badge={badge ? <span className="rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-ivory dark:text-night">{badge}</span> : null} />
        </div>
        <div>
          <BuyBox p={p} delivery={d ?? null} />
          <div className="mt-8">
            <Accordion
              items={[
                { title: t('product.description'), open: true, body: <div className="space-y-3 whitespace-pre-line">{tr(p.description, lang)}</div> },
                {
                  title: t('product.details'),
                  body: (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                      <dt className="font-semibold text-espresso">{t('product.fabric')}</dt><dd>{p.fabric}</dd>
                      <dt className="font-semibold text-espresso">{t('product.occasions')}</dt><dd>{p.occasions.map((o) => t(`occ.${o}`)).join(', ')}</dd>
                      <dt className="font-semibold text-espresso">{t('product.sku')}</dt><dd className="font-mono text-xs leading-6">{p.sku}</dd>
                    </dl>
                  ),
                },
                { title: t('product.care'), body: tr(p.care, lang) },
                {
                  title: t('product.delivery'),
                  body: d ? (
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>{t('product.insideDhaka', { days: d.insideDays })} — {money(d.insideDhaka, lang)}</li>
                      <li>{t('product.outsideDhaka', { days: d.outsideDays })} — {money(d.outsideDhaka, lang)}</li>
                      <li>{lang === 'bn' ? `${money(d.freeShippingThreshold, lang)}-এর বেশি অর্ডারে ডেলিভারি ফ্রি` : `Free delivery over ${money(d.freeShippingThreshold, lang)}`}</li>
                      <li>{t('product.exchange')}</li>
                    </ul>
                  ) : null,
                },
              ]}
            />
          </div>
        </div>
      </div>

      {rel && rel.completeTheLook.length > 0 && (
        <section className="mt-16 border-t border-line pt-14 sm:mt-24">
          <p className="eyebrow" data-reveal>{lang === 'bn' ? 'স্টাইলিং' : 'Styling'}</p>
          <h2 className="h-display mb-8 mt-3 text-[36px] sm:text-[48px]" data-reveal>{t('product.completeLook')}</h2>
          <ProductRail products={rel.completeTheLook.slice(0, 4)} lang={lang} />
        </section>
      )}

      <Reviews slug={p.slug} data={reviews} />

      {rel && rel.related.length > 0 && (
        <section className="border-t border-line py-14">
          <h2 className="h-display mb-8 text-[36px] sm:text-[48px]" data-reveal>{t('product.related')}</h2>
          <ProductGrid products={rel.related.slice(0, 4)} lang={lang} />
        </section>
      )}
      <RecentlyViewed exclude={p.slug} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name.en,
          description: p.shortDescription.en,
          sku: p.sku,
          image: p.images.map((i) => i.url),
          brand: { '@type': 'Brand', name: 'Ruposhi' },
          category: p.category,
          material: p.fabric,
          color: p.colors.map((c) => c.name.en).join(', '),
          ...(p.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount } } : {}),
          ...(reviews && reviews.items.length > 0
            ? { review: reviews.items.slice(0, 3).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating }, author: { '@type': 'Person', name: r.customerName }, reviewBody: r.body })) }
            : {}),
          offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/product/${p.slug}`,
            priceCurrency: 'BDT',
            price: p.price,
            availability: p.inStock ? 'https://schema.org/InStock' : p.preOrder ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: 'Ruposhi' },
            shippingDetails: d
              ? { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: d.insideDhaka, currency: 'BDT' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BD' } }
              : undefined,
            hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'BD', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 7 },
          },
        }}
      />
    </div>
  );
}
