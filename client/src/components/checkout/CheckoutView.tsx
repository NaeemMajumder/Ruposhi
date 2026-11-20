'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, ChevronDown, CreditCard, Loader2, Lock, MapPin, ShieldCheck, Smartphone, User, Wallet, BadgeCheck } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, money, num, tr } from '@/lib/format';
import { shake } from '@/lib/motion';
import { getSource, metaCookies, sessionId, track } from '@/lib/track';
import type { LocationTree, OrderView, PaymentMethod, PublicSettings } from '@/lib/types';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/auth';
import { useQuote } from '../layout/CartDrawer';
import { CouponBox, GiftWrap, Totals } from '../cart/Summary';
import { FormSk } from '../ui/Skeletons';
import { toast } from '../ui/Toast';
import { normalizePhone, OtpBox } from './OtpBox';

type Form = { name: string; phone: string; email: string; division: string; district: string; area: string; address: string; landmark: string; note: string };
const EMPTY: Form = { name: '', phone: '', email: '', division: '', district: '', area: '', address: '', landmark: '', note: '' };
const DRAFT = 'ruposhi-checkout-draft';

export function CheckoutView({ settings, locations }: { settings: PublicSettings | null; locations: LocationTree[] }) {
  const { t, lang } = useT();
  const router = useRouter();
  const { items, couponCode, giftWrap, clear } = useCart();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'otp', string>>>({});
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const idem = useRef<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  const abandonSent = useRef(false);

  useEffect(() => {
    setMounted(true);
    idem.current = crypto.randomUUID();
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null') as Form | null;
      setF({ ...EMPTY, ...(d ?? {}) });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mounted) sessionStorage.setItem(DRAFT, JSON.stringify(f));
  }, [f, mounted]);

  // signed in → fill anything still empty from the account (name, phone, email, default address)
  useEffect(() => {
    if (!mounted || !user) return;
    let ignore = false;
    apiFetch<{ addresses: { isDefault: boolean; division: string; district: string; area: string; address: string; landmark?: string }[] }>('/me')
      .then((p) => {
        if (ignore) return;
        const a = p.addresses.find((x) => x.isDefault) ?? p.addresses[0];
        setF((x) => ({
          ...x,
          name: x.name || user.name,
          phone: x.phone || user.phone,
          email: x.email || user.email,
          ...(a && !x.address ? { division: a.division, district: a.district, area: a.area, address: a.address, landmark: a.landmark ?? '' } : {}),
        }));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [mounted, user]);

  const phone = normalizePhone(f.phone);
  const location = f.division && f.district && f.area ? { division: f.division, district: f.district, area: f.area } : undefined;
  const { quote, loading } = useQuote({ couponCode: couponCode || undefined, giftWrap, location, paymentMethod: method, phone: phone ?? undefined }, mounted && items.length > 0);

  useEffect(() => {
    if (mounted && items.length) track('initiate_checkout', { value: items.reduce((s, i) => s + i.price * i.qty, 0), contentIds: items.map((i) => i.slug) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // abandoned-cart capture (once a valid phone exists) → admin can send a reminder SMS
  useEffect(() => {
    if (!phone || abandonSent.current || !items.length) return;
    const id = setTimeout(() => {
      abandonSent.current = true;
      apiFetch('/cart/abandon', { body: { phone, name: f.name || undefined, items: items.map((i) => ({ slug: i.slug, name: tr(i.name, 'en'), qty: i.qty, price: i.price, size: i.size, color: i.color })) } }).catch(() => {});
    }, 4000);
    return () => clearTimeout(id);
  }, [phone, items, f.name]);

  const div = locations.find((d) => d.division === f.division);
  const dist = div?.districts.find((d) => d.name === f.district);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setF((s) => ({ ...s, [k]: v, ...(k === 'division' ? { district: '', area: '' } : k === 'district' ? { area: '' } : {}) }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const p = settings?.payments;
  const methods = useMemo(
    () =>
      [
        p?.cod !== false && { id: 'cod' as const, icon: Banknote, title: t('checkout.cod'), sub: t('checkout.codSub') },
        p?.bkash && { id: 'bkash' as const, icon: Smartphone, title: t('checkout.bkash'), sub: t('checkout.bkashSub') },
        p?.sslcommerz && { id: 'sslcommerz' as const, icon: CreditCard, title: t('checkout.ssl'), sub: t('checkout.sslSub') },
        p?.bkashManual && { id: 'bkash_manual' as const, icon: Wallet, title: t('checkout.bkashManual'), sub: t('checkout.bkashManualSub') },
        p?.nagadManual && { id: 'nagad_manual' as const, icon: Wallet, title: t('checkout.nagadManual'), sub: t('checkout.bkashManualSub') },
      ].filter(Boolean) as { id: PaymentMethod; icon: typeof Banknote; title: string; sub: string }[],
    [p, t],
  );
  // a signed-in customer whose phone was verified at sign-up doesn't need a new code for that same number
  const accountVerified = !!user?.phoneVerified && user.phone === phone;
  const needOtp = method === 'cod' && !!p?.codOtpRequired && !accountVerified;

  const validate = () => {
    const e: typeof errors = {};
    if (f.name.trim().length < 2) e.name = lang === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name';
    if (!phone) e.phone = lang === 'bn' ? 'সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)' : 'Enter a valid mobile number (01XXXXXXXXX)';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = lang === 'bn' ? 'ইমেইল সঠিক নয়' : 'Invalid email';
    if (!f.division) e.division = t('checkout.select');
    if (!f.district) e.district = t('checkout.select');
    if (!f.area) e.area = t('checkout.select');
    if (f.address.trim().length < 5) e.address = lang === 'bn' ? 'পূর্ণ ঠিকানা লিখুন' : 'Please enter your full address';
    if (needOtp && !otpToken) e.otp = t('checkout.otpRequired');
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      shake(el ?? null);
      (el?.querySelector('input,select,textarea') as HTMLElement | null)?.focus({ preventScroll: true });
    }
    return !first;
  };

  const place = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (placing || !validate() || !quote) return;
    if (quote.hasIssues) {
      toast.error(lang === 'bn' ? 'ব্যাগে কিছু পণ্যের স্টক নেই — আপডেট করুন' : 'Some items in your bag need attention');
      return router.push('/cart');
    }
    setPlacing(true);
    try {
      const r = await apiFetch<{ order: OrderView; duplicate: boolean }>('/orders', {
        headers: { 'Idempotency-Key': idem.current },
        body: {
          customer: { name: f.name.trim(), phone, email: f.email.trim() },
          address: { division: f.division, district: f.district, area: f.area, address: f.address.trim(), landmark: f.landmark.trim() || undefined },
          items: items.map(({ slug, sku, qty }) => ({ slug, sku, qty })),
          couponCode: couponCode || undefined,
          paymentMethod: method,
          giftWrap,
          customerNote: f.note.trim() || undefined,
          otpToken: otpToken ?? undefined,
          source: getSource(),
          sessionId: sessionId(),
          ...metaCookies(),
        },
      });
      const o = r.order;
      sessionStorage.setItem(`ruposhi-order-${o.orderNo}`, JSON.stringify(o));
      sessionStorage.removeItem(DRAFT);
      if (method === 'bkash' || method === 'sslcommerz') {
        const g = await apiFetch<{ redirectUrl: string }>(`/payments/${o.orderNo}/init`, { body: { phone } });
        clear();
        window.location.href = g.redirectUrl;
        return;
      }
      clear();
      router.push(`/order/${o.orderNo}`);
    } catch (err) {
      setPlacing(false);
      const msg = err instanceof ApiError ? err.message : t('errors.generic');
      toast.error(msg);
      shake(document.querySelector('[data-place]'));
      if (err instanceof ApiError && err.status === 409) router.push('/cart');
    }
  };

  if (!mounted) return <FormSk />; // heading is server-rendered by the page (fast LCP)
  if (!items.length)
    return (
      <div className="container-x flex flex-col items-center py-24 text-center">
        <p className="font-display text-4xl">{t('cart.empty')}</p>
        <Link href="/shop" className="btn-primary mt-6">{t('cart.continueShopping')}</Link>
      </div>
    );

  const fieldErr = (k: keyof typeof errors) => errors[k] && <p className="mt-1.5 animate-fade text-xs font-medium text-danger" role="alert">{errors[k]}</p>;
  const fc = (k: keyof Form) => cn('field', errors[k] && '!border-danger ring-2 ring-danger/15');

  const summary = (
    <div className="space-y-5">
      <ul className="space-y-3">
        {(quote?.lines ?? []).map((l) => (
          <li key={l.sku} className="flex items-center gap-3">
            <span className="arch-soft media relative h-[72px] w-[54px] shrink-0 overflow-hidden">
              <Image src={l.image} alt="" fill sizes="54px" className="object-cover" />
              <span className="absolute right-0.5 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-espresso px-1 text-[10px] font-bold text-cream">{num(l.qty, lang)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 text-sm font-medium">{tr(l.name, lang)}</span>
              <span className="text-xs text-mocha">{l.size} · {l.color}</span>
            </span>
            <span className="text-sm tabular-nums">{money(l.lineTotal, lang)}</span>
          </li>
        ))}
        {!quote && [1, 2].map((k) => <li key={k} className="skeleton h-16" />)}
      </ul>
      <CouponBox quote={quote} />
      <Totals quote={quote} loading={loading} showDelivery />
      {quote && quote.advance > 0 && <p className="rounded-xl bg-gold/15 p-3 text-xs">{t('checkout.advanceNote', { amount: money(quote.advance, lang) })}</p>}
    </div>
  );

  return (
    <div className="container-x pb-32 lg:pb-20">

      {/* mobile summary toggle */}
      <button type="button" onClick={() => setSummaryOpen((x) => !x)} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-sand px-4 py-3.5 text-sm font-semibold lg:hidden" aria-expanded={summaryOpen}>
        <span className="flex items-center gap-2">{t('checkout.summary')} <ChevronDown className={cn('h-4 w-4 transition-transform duration-500', summaryOpen && 'rotate-180')} /></span>
        <span className="font-display text-xl">{quote ? money(quote.total, lang) : '…'}</span>
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-500 ease-[var(--ease-silk)] lg:hidden', summaryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden"><div className="pt-5">{summary}</div></div>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
        <form ref={formRef} onSubmit={place} noValidate className="stagger space-y-6">
          {/* contact */}
          <Section n={1} icon={User} title={t('checkout.contact')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div data-field="name">
                <label className="label" htmlFor="c-name">{t('checkout.name')} *</label>
                <input id="c-name" autoComplete="name" value={f.name} onChange={set('name')} maxLength={80} className={fc('name')} aria-invalid={!!errors.name} />
                {fieldErr('name')}
              </div>
              <div data-field="phone">
                <label className="label" htmlFor="c-phone">{t('checkout.phone')} *</label>
                <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set('phone')} maxLength={16} className={fc('phone')} aria-invalid={!!errors.phone} />
                {fieldErr('phone')}
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="c-email">{t('checkout.email')}</label>
              <input id="c-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} maxLength={120} className={fc('email')} />
              {fieldErr('email')}
            </div>
            {needOtp && phone && (
              <div data-field="otp" className="mt-4 animate-scale-in">
                <OtpBox phone={phone} purpose="checkout" onVerified={(r) => (setOtpToken(r.token), setErrors((x) => ({ ...x, otp: undefined })))} />
                {fieldErr('otp')}
              </div>
            )}
            {accountVerified && (
              <p className="mt-4 flex animate-scale-in items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                <BadgeCheck className="h-5 w-5" /> {lang === 'bn' ? 'আপনার অ্যাকাউন্টের নম্বর — আগেই যাচাই করা' : 'Your account number — already verified'}
              </p>
            )}
          </Section>

          {/* address */}
          <Section n={2} icon={MapPin} title={t('checkout.shipping')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select id="division" label={t('checkout.division')} value={f.division} onChange={set('division')} options={locations.map((l) => l.division)} error={errors.division} placeholder={t('checkout.select')} />
              <Select id="district" label={t('checkout.district')} value={f.district} onChange={set('district')} options={div?.districts.map((d) => d.name) ?? []} error={errors.district} placeholder={t('checkout.select')} disabled={!div} />
              <Select id="area" label={t('checkout.area')} value={f.area} onChange={set('area')} options={dist?.areas ?? []} error={errors.area} placeholder={t('checkout.select')} disabled={!dist} />
            </div>
            <div className="mt-4" data-field="address">
              <label className="label" htmlFor="c-address">{t('checkout.address')} *</label>
              <input id="c-address" autoComplete="street-address" value={f.address} onChange={set('address')} maxLength={200} className={fc('address')} aria-invalid={!!errors.address} />
              {fieldErr('address')}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="c-landmark">{t('checkout.landmark')}</label>
                <input id="c-landmark" value={f.landmark} onChange={set('landmark')} maxLength={120} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="c-note">{t('checkout.note')}</label>
                <input id="c-note" value={f.note} onChange={set('note')} maxLength={500} className="field" />
              </div>
            </div>
            {quote?.zone && (
              <p key={quote.zone} className="mt-4 flex animate-fade items-center gap-2 text-sm text-mocha">
                <MapPin className="h-4 w-4 text-bronze" />
                {quote.zone === 'inside_dhaka' ? (lang === 'bn' ? 'ঢাকার ভেতরে' : 'Inside Dhaka') : quote.zone === 'dhaka_suburb' ? (lang === 'bn' ? 'ঢাকার পার্শ্ববর্তী' : 'Dhaka suburbs') : (lang === 'bn' ? 'ঢাকার বাইরে' : 'Outside Dhaka')}
                {' · '}{t('cart.delivery')}: {quote.deliveryCharge === 0 ? t('common.free') : money(quote.deliveryCharge, lang)}
              </p>
            )}
          </Section>

          {/* payment */}
          <Section n={3} icon={ShieldCheck} title={t('checkout.payment')}>
            <div className="space-y-3" role="radiogroup" aria-label={t('checkout.payment')}>
              {methods.map((m) => {
                const on = method === m.id;
                const Icon = m.icon;
                return (
                  <label key={m.id} className={cn('flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-300', on ? 'border-espresso bg-blush shadow-[0_10px_30px_-20px_rgba(44,24,16,.6)]' : 'border-line hover:border-bronze')}>
                    <input type="radio" name="pm" value={m.id} checked={on} onChange={() => (setMethod(m.id), track('add_payment_info', { value: quote?.total }))} className="sr-only" />
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-espresso' : 'border-line')}>
                      <span className={cn('h-2.5 w-2.5 rounded-full bg-espresso transition-transform duration-300 ease-[var(--ease-out-back)]', on ? 'scale-100' : 'scale-0')} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{m.title}</span>
                      <span className="text-xs text-mocha">{m.sub}</span>
                    </span>
                    <Icon className={cn('h-6 w-6 transition-colors', on ? 'text-bronze' : 'text-mocha/60')} />
                  </label>
                );
              })}
            </div>
            <div className="mt-5"><GiftWrap fee={settings?.delivery.giftWrapFee ?? 150} /></div>
          </Section>

          <div className="hidden lg:block">
            <PlaceButton placing={placing} disabled={!quote || loading} total={quote ? money(quote.total, lang) : ''} />
            <p className="mt-3 text-center text-xs text-mocha">{t('checkout.agree')}</p>
          </div>
        </form>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="card animate-scale-in p-6">
            <h2 className="mb-5 font-display text-2xl">{t('checkout.summary')}</h2>
            {summary}
          </div>
        </aside>
      </div>

      {/* mobile sticky place-order */}
      <div className="fixed inset-x-0 bottom-0 z-40 animate-[slideInB_.5s_var(--ease-silk)_both] border-t border-line bg-cream/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
        <PlaceButton placing={placing} disabled={!quote || loading} total={quote ? money(quote.total, lang) : ''} onClick={() => place()} />
      </div>
    </div>
  );
}

function PlaceButton({ placing, disabled, total, onClick }: { placing: boolean; disabled: boolean; total: string; onClick?: () => void }) {
  const { t } = useT();
  return (
    <button data-place type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={placing || disabled} className="btn-primary relative h-14 w-full overflow-hidden text-base">
      {placing ? (
        <span className="inline-flex animate-fade items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> {t('checkout.placing')}</span>
      ) : (
        <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4" /> {t('checkout.placeOrder')} {total && <span className="opacity-80">· {total}</span>}</span>
      )}
      {placing && <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[navbar_6s_var(--ease-silk)_forwards] bg-gold" />}
    </button>
  );
}

function Section({ n, icon: Icon, title, children }: { n: number; icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 font-display text-2xl">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-espresso font-sans text-sm font-bold text-cream">{n}</span>
        {title}
        <Icon className="ml-auto h-5 w-5 text-bronze" />
      </h2>
      {children}
    </section>
  );
}

function Select({ id, label, value, onChange, options, error, placeholder, disabled }: { id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[]; error?: string; placeholder: string; disabled?: boolean }) {
  return (
    <div data-field={id}>
      <label className="label" htmlFor={`c-${id}`}>{label} *</label>
      <div className="relative">
        <select id={`c-${id}`} value={value} onChange={onChange} disabled={disabled} aria-invalid={!!error} className={cn('field appearance-none !pr-10 disabled:opacity-50', error && '!border-danger ring-2 ring-danger/15')}>
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
      </div>
      {error && <p className="mt-1.5 animate-fade text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
