import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { tr } from '@/lib/format';
import { PageHeader } from '@/components/shop/PageHeader';
import { CountUp } from '@/components/ui/CountUp';
import { LotusMark } from '@/components/ui/Logo';

export const metadata: Metadata = { title: 'Our story', description: 'Ruposhi brings together the weavers of Tangail, the Jamdani artisans of Rupganj and the embroiderers of Old Dhaka.', alternates: { canonical: '/about' } };

export default async function AboutPage() {
  const [{ t, lang }, home] = await Promise.all([getI18n(), api.home()]);
  const imgs = home?.lookbook.map((l) => l.image) ?? [];
  const chapters = [
    { k: 'Tangail', en: 'Tant & half-silk from the looms of Tangail — the everyday elegance of Bengal.', bn: 'টাঙ্গাইলের তাঁত ও হাফ-সিল্ক — বাংলার প্রতিদিনের সৌন্দর্য।' },
    { k: 'Rupganj', en: 'Dhakai Jamdani, a UNESCO-listed craft, woven motif by motif along the Shitalakshya.', bn: 'শীতলক্ষ্যার তীরে মোটিফ ধরে ধরে বোনা ঢাকাই জামদানি — ইউনেস্কো স্বীকৃত শিল্প।' },
    { k: 'Old Dhaka', en: 'Chikankari and zari by hand — the embroidery that makes an Eid panjabi feel like an heirloom.', bn: 'হাতের চিকনকারি ও জরি — যে সূচিকর্মে ঈদের পাঞ্জাবি হয়ে ওঠে উত্তরাধিকার।' },
  ];
  return (
    <div className="pb-20">
      <div className="container-x">
        <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.about') }]} eyebrow={t('nav.about')} title={t('home.story')} sub={t('home.storyBody')} />
      </div>
      <div className="container-x grid grid-cols-3 gap-3 sm:gap-5">
        {imgs.slice(0, 3).map((src, i) => (
          <div key={src} className={`arch media relative aspect-[3/4] overflow-hidden ${i === 1 ? 'translate-y-8' : ''}`} style={{ animation: `rise .9s var(--ease-silk) ${i * 120}ms both` }}>
            <Image src={src} alt="" fill priority={i === 0} sizes="33vw" className="object-cover" />
          </div>
        ))}
      </div>
      <section className="container-x mt-24 grid gap-10 sm:grid-cols-3">
        {[[64, lang === 'bn' ? 'জেলায় ডেলিভারি' : 'districts delivered'], [120, lang === 'bn' ? 'কারিগর পরিবার' : 'artisan families'], [7, lang === 'bn' ? 'দিনের সহজ এক্সচেঞ্জ' : 'day easy exchange']].map(([n, l]) => (
          <div key={String(l)} className="border-t border-line pt-6" data-reveal>
            <p className="font-display text-7xl text-bronze"><CountUp value={Number(n)} lang={lang} />+</p>
            <p className="mt-2 text-mocha">{l}</p>
          </div>
        ))}
      </section>
      <section className="grain mt-24 bg-night py-20 text-ivory">
        <div className="container-x">
          <p className="eyebrow !text-gold">{lang === 'bn' ? 'তিনটি তাঁতঘর' : 'Three workshops'}</p>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {chapters.map((c, i) => (
              <div key={c.k} data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="font-display text-6xl text-gold/40">0{i + 1}</p>
                <h2 className="mt-2 font-display text-4xl">{c.k}</h2>
                <p className="mt-3 text-ivory/70">{lang === 'bn' ? c.bn : c.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-x mt-24 text-center" data-reveal>
        <LotusMark className="mx-auto h-14 w-14 animate-spin-slow text-gold" />
        <h2 className="h-display mx-auto mt-6 max-w-2xl text-[40px] sm:text-[56px]">{home?.promises[0] ? tr(home.promises[0].title, lang) : ''}</h2>
        <Link href="/shop" className="btn-primary mt-8">{t('nav.allProducts')} <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
