import { getI18n } from '@/i18n/server';
import { api } from '@/lib/api';
import { CategoryArches, FlashSale, Hero, Lookbook, Occasions, ProductRail, Promises, SectionHead, StoryBand, Testimonials } from '@/components/home/Sections';
import { ProductGrid } from '@/components/product/ProductCard';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { LotusMark } from '@/components/ui/Logo';
import { StoreOffline } from '@/components/layout/StoreOffline';

export const revalidate = 60;
export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const { lang, t } = await getI18n();
  const data = await api.home();
  if (!data) return <StoreOffline />;
  return (
    <>
      <Hero data={data} lang={lang} />
      <CategoryArches categories={data.categories} lang={lang} />
      {data.flashSale && data.flashSale.items.length > 0 && <FlashSale data={data.flashSale} lang={lang} />}
      <section className="container-x py-16 sm:py-24">
        <SectionHead eyebrow={t('home.newArrivals')} title={lang === 'bn' ? 'তাঁত থেকে সরাসরি' : 'Fresh off the loom'} sub={t('home.newSub')} href="/shop?sort=newest" cta={t('common.viewAll')} />
        <ProductGrid products={data.newArrivals.slice(0, 8)} lang={lang} />
      </section>
      <div className="cv-auto"><StoryBand data={data} lang={lang} /></div>
      <section className="cv-auto container-x py-16 sm:py-24">
        <SectionHead eyebrow={t('home.bestsellers')} title={lang === 'bn' ? 'বারবার ফিরে আসার মতো' : 'Worth coming back for'} sub={t('home.bestSub')} href="/shop?sort=popular" cta={t('common.viewAll')} />
        <ProductRail products={data.bestsellers.slice(0, 8)} lang={lang} />
      </section>
      <div className="cv-auto">
        <Occasions lang={lang} />
        <Promises data={data} lang={lang} />
      </div>
      <div className="cv-auto">
        <Lookbook data={data} lang={lang} />
        <Testimonials data={data} lang={lang} />
      </div>
      <section className="container-x pb-6">
        <div className="grain relative overflow-hidden rounded-[32px] bg-sand px-6 py-14 text-center sm:px-12 sm:py-20">
          <LotusMark className="mx-auto h-14 w-14 text-gold" />
          <h2 className="h-display mx-auto mt-5 max-w-2xl text-[38px] sm:text-[54px]">{t('home.newsletter')}</h2>
          <p className="mx-auto mt-3 max-w-md text-mocha">{t('home.newsletterSub')}</p>
          <div className="mx-auto max-w-md">
            <NewsletterForm source="popup" />
          </div>
        </div>
      </section>
    </>
  );
}
