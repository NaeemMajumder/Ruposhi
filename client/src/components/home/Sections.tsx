import { FadeImage as Image } from '../ui/FadeImage';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { dictionaries } from '@/i18n/dictionaries';
import { makeT } from '@/i18n/t';
import { cn, toBnDigits, tr } from '@/lib/format';
import type { Category, HomeData, Lang, Product } from '@/lib/types';
import { ProductCard } from '../product/ProductCard';
import { LotusMark } from '../ui/Logo';
import { Countdown } from '../ui/Countdown';
import { Stars } from '../ui/Price';

export function SectionHead({ eyebrow, title, sub, href, cta, className, light }: { eyebrow?: string; title: string; sub?: string; href?: string; cta?: string; className?: string; light?: boolean }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between', className)} data-reveal>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn('eyebrow mb-3', light && '!text-gold')}>{eyebrow}</p>}
        <h2 className={cn('h-display text-[40px] sm:text-[56px]', light && 'text-ivory')}>{title}</h2>
        {sub && <p className={cn('mt-3 max-w-lg text-[15px] leading-relaxed', light ? 'text-ivory/70' : 'text-mocha')}>{sub}</p>}
      </div>
      {href && cta && (
        <Link href={href} className={cn('btn-link shrink-0', light && '!text-gold')}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function Hero({ data, lang }: { data: HomeData; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  const h = data.hero[0];
  if (!h) return null;
  const [l1, l2] = tr(h.title, lang).split('\n');
  return (
    <section className="grain relative overflow-hidden bg-cream">
      <LotusMark className="pointer-events-none absolute -left-24 top-10 hidden h-[420px] w-[420px] text-gold/10 motion-safe:animate-spin-slow lg:block" strokeWidth={0.6} />
      <div className="container-x grid items-center gap-8 pb-12 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-20 lg:pt-12">
        <div className="order-2 lg:order-1">
          <p className="eyebrow animate-rise">{tr(h.eyebrow, lang)}</p>
          <h1 className="h-display mt-4 animate-lift text-[46px] min-[400px]:text-[52px] sm:text-[84px] lg:text-[104px]">
            {l1}
            <br />
            <em className="font-display italic text-bronze">{l2}</em>
          </h1>
          <p className="mt-6 max-w-md animate-lift text-[16px] leading-relaxed text-mocha [animation-delay:80ms]">{tr(h.subtitle, lang)}</p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
            <Link href={h.href} className="btn-primary h-12 px-7">{tr(h.cta, lang)} <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/shop" className="btn-ghost h-12 px-7">{t('nav.allProducts')}</Link>
          </div>
          <div className="mt-10 flex animate-rise flex-wrap gap-2 [animation-delay:320ms]">
            {data.hero.slice(1).map((s) => (
              <Link key={s.href} href={s.href} className="group flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 transition hover:border-bronze">
                <span className="relative h-10 w-10 overflow-hidden rounded-full media">
                  <Image src={s.image} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="text-[13px] font-semibold">{tr(s.eyebrow, lang)}</span>
                <ArrowUpRight className="h-4 w-4 text-bronze transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
        <div className="relative order-1 mx-auto w-full max-w-[560px] lg:order-2">
          <div className="arch relative aspect-[4/5] overflow-hidden media shadow-[0_40px_80px_-40px_rgba(44,24,16,.55)]">
            <Image src={h.image} alt={tr(h.subtitle, lang)} fill priority fetchPriority="high" sizes="(max-width: 1024px) 92vw, 560px" quality={75} className="object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-3 hidden h-36 w-36 overflow-hidden rounded-full border-[6px] border-cream bg-sand shadow-xl sm:block lg:-left-10 lg:h-44 lg:w-44">
            {data.hero[1] && <Image src={data.hero[1].image} alt="" fill sizes="176px" className="object-cover" />}
          </div>
          <div className="absolute -right-2 top-8 hidden rotate-6 motion-safe:animate-float rounded-full bg-night px-5 py-3 text-center text-ivory shadow-xl sm:block">
            <p className="font-display text-2xl leading-none">{lang === 'bn' ? toBnDigits('100%') : '100%'}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">{lang === 'bn' ? 'আসল আলোয়' : 'real light'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CategoryArches({ categories, lang }: { categories: Category[]; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  return (
    <section className="container-x py-14 sm:py-20">
      <SectionHead eyebrow={t('home.categories')} title={lang === 'bn' ? 'চারটি স্বাক্ষর' : 'Four signatures'} sub={t('home.categoriesSub')} />
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-6 sm:overflow-visible sm:px-0">
        {categories.map((c, i) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="group w-[62vw] shrink-0 snap-start sm:w-auto" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
            <div className="arch relative aspect-[3/4] overflow-hidden media">
              <Image src={c.image} alt={tr(c.name, lang)} fill sizes="(max-width: 640px) 62vw, 25vw" className="object-cover transition duration-[1100ms] ease-[var(--ease-silk)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 bg-gradient-to-t from-night/55 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center text-ivory">
                <p className="font-display text-3xl">{tr(c.name, lang)}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-gold-soft">{lang === 'bn' ? `${toBnDigits(String(c.productCount ?? 0))}টি ডিজাইন` : `${c.productCount ?? 0} designs`}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductRail({ products, lang }: { products: Product[]; lang: Lang }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
      {products.map((p) => <ProductCard key={p._id} p={p} lang={lang} className="w-[46vw] shrink-0 snap-start sm:w-[30vw] lg:w-auto" />)}
    </div>
  );
}

export function FlashSale({ data, lang }: { data: NonNullable<HomeData['flashSale']>; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  return (
    <section className="grain overflow-hidden bg-night py-14 text-ivory sm:py-20">
      <div className="container-x">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between" data-reveal>
          <div>
            <p className="eyebrow !text-gold">{t('home.flash')} · −{lang === 'bn' ? toBnDigits(String(data.percent)) : data.percent}%</p>
            <h2 className="h-display mt-3 text-[42px] sm:text-[60px]">{tr(data.title, lang)}</h2>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-ivory/60">{t('home.endsIn')}</span>
            <Countdown endsAt={data.endsAt} tone="light" />
          </div>
        </div>
        <div className="[&_h3]:text-ivory [&_h3_a:hover]:text-gold [&_.text-espresso]:!text-ivory [&_.text-mocha]:!text-ivory/60 [&_.text-bronze]:!text-gold">
          <ProductRail products={data.items.slice(0, 8)} lang={lang} />
        </div>
      </div>
    </section>
  );
}

export function StoryBand({ data, lang }: { data: HomeData; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  const img = data.lookbook[0]?.image;
  const img2 = data.lookbook[1]?.image;
  return (
    <section className="bg-sand py-16 sm:py-24">
      <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="relative mx-auto grid w-full max-w-lg grid-cols-[1.25fr_1fr] items-end gap-4" data-reveal>
          {img && <div className="arch relative aspect-[3/4] overflow-hidden"><Image src={img} alt="" fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover" /></div>}
          {img2 && <div className="arch relative mb-12 aspect-[3/4] overflow-hidden"><Image src={img2} alt="" fill sizes="(max-width: 1024px) 40vw, 240px" className="object-cover" /></div>}
          <LotusMark className="absolute -top-8 right-6 h-20 w-20 text-gold motion-safe:animate-spin-slow" strokeWidth={1.2} />
        </div>
        <div data-reveal>
          <p className="eyebrow">{t('nav.about')}</p>
          <h2 className="h-display mt-4 text-[40px] sm:text-[58px]">{t('home.story')}</h2>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-mocha">{t('home.storyBody')}</p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-4 border-y border-line py-6">
            {[['64', lang === 'bn' ? 'জেলায় ডেলিভারি' : 'districts delivered'], ['7', lang === 'bn' ? 'দিনের এক্সচেঞ্জ' : 'day exchange'], ['4.8★', lang === 'bn' ? 'গড় রেটিং' : 'average rating']].map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-4xl">{lang === 'bn' ? toBnDigits(n) : n}</p>
                <p className="mt-1 text-xs text-mocha">{l}</p>
              </div>
            ))}
          </div>
          <Link href="/about" className="btn-ghost mt-8">{t('home.ourStory')} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

const OCC_IMAGES: Record<string, number> = { wedding: 14694822, eid: 10336592, 'gaye-holud': 33885315, party: 38371877, festive: 8157118, office: 28758558 };

export function Occasions({ lang }: { lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  const list = ['wedding', 'eid', 'gaye-holud', 'party', 'festive', 'office'];
  return (
    <section className="container-x py-16 sm:py-24">
      <SectionHead eyebrow={t('nav.occasions')} title={t('home.occasionTitle')} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
        {list.map((o, i) => (
          <Link key={o} href={`/shop?occasion=${o}`} className="group relative block" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
            <div className="relative aspect-square overflow-hidden rounded-full media">
              <Image src={`https://images.pexels.com/photos/${OCC_IMAGES[o]}/pexels-photo-${OCC_IMAGES[o]}.jpeg?auto=compress&cs=tinysrgb&w=600`} alt="" fill sizes="(max-width: 640px) 45vw, 16vw" className="object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-gold/40 transition group-hover:ring-4 group-hover:ring-gold/70" />
            </div>
            <p className="mt-3 text-center font-display text-xl sm:text-2xl">{t(`occ.${o}`)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Lookbook({ data, lang }: { data: HomeData; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  return (
    <section className="container-x py-16 sm:py-24">
      <SectionHead eyebrow={t('home.lookbook')} title={lang === 'bn' ? 'আসল আলোয়' : 'In real light'} sub={t('home.lookbookSub')} />
      <div className="columns-2 gap-3 sm:gap-5 lg:columns-3">
        {data.lookbook.map((l, i) => (
          <Link key={i} href={`/product/${l.productSlug}`} className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-2xl media sm:mb-5" data-reveal>
            <div className={cn('relative', i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-[4/5]' : 'aspect-square')}>
              <Image src={l.image} alt="" fill sizes="(max-width: 1024px) 48vw, 32vw" className="object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-night/70 to-transparent p-4 text-ivory">
              <p className="font-display text-lg leading-tight sm:text-2xl">{tr(l.caption, lang)}</p>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-gold" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Promises({ data, lang }: { data: HomeData; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  return (
    <section className="border-y border-line bg-blush">
      <div className="container-x py-14 sm:py-16">
        <p className="eyebrow mb-8 text-center">{t('home.promise')}</p>
        <div className="grid gap-8 sm:grid-cols-3">
          {data.promises.map((p, i) => (
            <div key={i} className="text-center" data-reveal>
              <p className="font-display text-5xl text-gold">{lang === 'bn' ? toBnDigits(`0${i + 1}`) : `0${i + 1}`}</p>
              <h3 className="mt-3 font-display text-2xl">{tr(p.title, lang)}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-mocha">{tr(p.text, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ data, lang }: { data: HomeData; lang: Lang }) {
  const t = makeT(dictionaries[lang]);
  return (
    <section className="container-x py-16 sm:py-24">
      <SectionHead eyebrow={t('home.testimonials')} title={lang === 'bn' ? 'ভালোবাসার কথা' : 'Loved, in their words'} />
      <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-0">
        {data.testimonials.map((r, i) => (
          <figure key={i} className="card lift w-[82vw] shrink-0 snap-start p-6 sm:w-auto sm:p-8" data-reveal>
            <Stars value={r.rating} />
            <blockquote className="mt-4 font-display text-[22px] leading-snug">“{tr(r.text, lang)}”</blockquote>
            <figcaption className="mt-5 text-sm"><span className="font-semibold">{r.name}</span> <span className="text-mocha">· {r.city}</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
