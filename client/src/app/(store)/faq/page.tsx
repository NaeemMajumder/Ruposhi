import type { Metadata } from 'next';
import { FAQ } from '@/content/site';
import { getI18n } from '@/i18n/server';
import { tr } from '@/lib/format';
import { PageHeader } from '@/components/shop/PageHeader';
import { Accordion } from '@/components/product/Details';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = { title: 'FAQ', description: 'Delivery, Cash on Delivery, sizes, exchange and payment — answers to common Ruposhi questions.', alternates: { canonical: '/faq' } };

export default async function FaqPage() {
  const { t, lang } = await getI18n();
  return (
    <div className="container-x max-w-3xl pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('footer.faq') }]} eyebrow={t('footer.help')} title={lang === 'bn' ? 'সাধারণ প্রশ্ন' : 'Questions, answered'} />
      <Accordion items={FAQ.map((f, i) => ({ title: tr(f.q, lang), body: tr(f.a, lang), open: i === 0 }))} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q.en, acceptedAnswer: { '@type': 'Answer', text: f.a.en } })) }} />
    </div>
  );
}
