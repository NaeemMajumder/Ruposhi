import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { PageHeader } from '@/components/shop/PageHeader';
import { ContactForm } from '@/components/shop/ContactForm';

export const metadata: Metadata = { title: 'Contact', description: 'Call, WhatsApp or write to Ruposhi — we reply within a few hours.', alternates: { canonical: '/contact' } };

export default async function ContactPage() {
  const [{ t, lang }, s] = await Promise.all([getI18n(), api.settings()]);
  const st = s?.store;
  const items = st
    ? [
        { icon: Phone, label: lang === 'bn' ? 'ফোন' : 'Call', value: st.phone, href: `tel:${st.phone.replace(/\s|-/g, '')}` },
        { icon: MessageCircle, label: 'WhatsApp', value: st.whatsapp, href: `https://wa.me/${st.whatsapp.replace(/\D/g, '')}` },
        { icon: Mail, label: 'Email', value: st.email, href: `mailto:${st.email}` },
        { icon: MapPin, label: lang === 'bn' ? 'শোরুম' : 'Studio', value: st.address },
      ]
    : [];
  return (
    <div className="container-x pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.contact') }]} eyebrow={t('nav.contact')} title={lang === 'bn' ? 'আমরা শুনছি' : 'We’re listening'} sub={lang === 'bn' ? 'সাধারণত কয়েক ঘণ্টার মধ্যে উত্তর দিই — সকাল ১০টা থেকে রাত ৯টা।' : 'We usually reply within a few hours — 10am to 9pm, every day.'} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <ul className="stagger space-y-3">
          {items.map((i) => (
            <li key={i.label}>
              {i.href ? (
                <a href={i.href} target={i.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="card lift flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sand"><i.icon className="h-5 w-5 text-bronze" /></span>
                  <span><span className="block text-xs uppercase tracking-[0.2em] text-mocha">{i.label}</span><span className="font-semibold">{i.value}</span></span>
                </a>
              ) : (
                <div className="card flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sand"><i.icon className="h-5 w-5 text-bronze" /></span>
                  <span><span className="block text-xs uppercase tracking-[0.2em] text-mocha">{i.label}</span><span className="font-semibold">{i.value}</span></span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <ContactForm />
      </div>
    </div>
  );
}
