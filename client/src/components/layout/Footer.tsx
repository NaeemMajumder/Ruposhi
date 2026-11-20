import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Facebook, Instagram, Youtube } from '../ui/BrandIcons';
import { getI18n } from '@/i18n/server';
import type { Category, PublicSettings } from '@/lib/types';
import { tr } from '@/lib/format';
import { LotusMark } from '../ui/Logo';
import { NewsletterForm } from '../home/NewsletterForm';

export async function Footer({ settings, categories }: { settings: PublicSettings | null; categories: Category[] }) {
  const { t, lang } = await getI18n();
  const s = settings?.store;
  return (
    <footer className="grain mt-20 bg-night pb-24 text-ivory/85 lg:pb-0">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <div className="flex items-center gap-3 text-ivory">
            <LotusMark className="h-10 w-10 text-gold" />
            <span className="font-display text-3xl tracking-[0.3em]">RUPOSHI</span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">{t('footer.about')}</p>
          <div className="mt-6 flex gap-2">
            {[{ href: s?.facebook, I: Facebook, l: 'Facebook' }, { href: s?.instagram, I: Instagram, l: 'Instagram' }, { href: s?.youtube, I: Youtube, l: 'YouTube' }].map(({ href, I, l }) =>
              href ? (
                <a key={l} href={href} target="_blank" rel="noopener noreferrer" aria-label={l} className="grid h-11 w-11 place-items-center rounded-full border border-ivory/15 transition hover:border-gold hover:text-gold">
                  <I className="h-4 w-4" />
                </a>
              ) : null,
            )}
          </div>
        </div>
        <div>
          <p className="eyebrow !text-gold">{t('footer.shop')}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="hover:text-gold">{tr(c.name, lang)}</Link></li>)}
            <li><Link href="/shop?isNew=true" className="hover:text-gold">{t('nav.newIn')}</Link></li>
            <li><Link href="/journal" className="hover:text-gold">{t('nav.journal')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-gold">{t('footer.help')}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/track" className="hover:text-gold">{t('nav.track')}</Link></li>
            <li><Link href="/faq" className="hover:text-gold">{t('footer.faq')}</Link></li>
            <li><Link href="/policies/shipping" className="hover:text-gold">{t('footer.shipping')}</Link></li>
            <li><Link href="/policies/returns" className="hover:text-gold">{t('footer.returns')}</Link></li>
            <li><Link href="/size-guide" className="hover:text-gold">{t('footer.sizeGuide')}</Link></li>
            <li><Link href="/about" className="hover:text-gold">{t('nav.about')}</Link></li>
            <li><Link href="/contact" className="hover:text-gold">{t('nav.contact')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-gold">{t('home.newsletter')}</p>
          <p className="mt-3 text-sm text-ivory/70">{t('home.newsletterSub')}</p>
          <NewsletterForm tone="dark" source="footer" />
          <ul className="mt-6 space-y-2 text-sm text-ivory/75">
            {s?.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`tel:${s.phone.replace(/\s|-/g, '')}`}>{s.phone}</a></li>}
            {s?.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s?.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{s.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-ivory/60 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span>{t('footer.payments')}:</span>
            {['COD', 'bKash', 'Nagad', 'Visa', 'Mastercard', 'Amex'].map((p) => (
              <span key={p} className="rounded border border-ivory/15 px-2 py-1 text-[11px] font-semibold text-ivory/80">{p}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/policies/privacy" className="hover:text-gold">{t('footer.privacy')}</Link>
            <Link href="/policies/terms" className="hover:text-gold">{t('footer.terms')}</Link>
            <span>© {new Date().getFullYear()} Ruposhi. {t('footer.rights')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
