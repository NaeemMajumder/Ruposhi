'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Copy, Gift, Heart, Home, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, MapPin, Package, Pencil, Plus, Star, Trash2, User } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num, toBnDigits, tr } from '@/lib/format';
import type { LocationTree, OrderView, Product } from '@/lib/types';
import { useAuth, useUser } from '@/store/auth';
import { ChangePasswordForm } from '../auth/ChangePassword';
import { PasswordField, TextField } from '../auth/Fields';
import { OrderDetail } from '../order/OrderDetail';
import { ProductCard } from '../product/ProductCard';
import { Modal } from '../ui/Sheet';
import { Pagination, usePaged } from '../ui/Pagination';
import { Sk, TableSk } from '../ui/Skeletons';
import { CountUp } from '../ui/CountUp';
import { toast } from '../ui/Toast';

type Addr = { id: string; label: string; division: string; district: string; area: string; address: string; landmark?: string; isDefault: boolean };
type Profile = { _id: string; name: string; phone: string; email?: string; addresses: Addr[]; loyaltyPoints: number; loyaltyValue: number; referralCode: string; orderCount: number; totalSpent: number; memberSince: string; wishlistCount: number; phoneVerified?: boolean; passwordChangedAt?: string; lastLoginAt?: string };

const TABS = [
  { id: 'overview', icon: Home },
  { id: 'orders', icon: Package },
  { id: 'addresses', icon: MapPin },
  { id: 'wishlist', icon: Heart },
  { id: 'rewards', icon: Gift },
  { id: 'profile', icon: User },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function AccountView({ locations }: { locations: LocationTree[] }) {
  const { t, lang } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const { user, ready } = useUser();
  const logout = useAuth((s) => s.logout);
  const customerId = user?._id;
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const tab = (TABS.find((x) => x.id === sp.get('tab'))?.id ?? 'overview') as Tab;
  const tabsRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ left: 0, width: 0 });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && ready && !customerId) router.replace('/login?next=/account');
  }, [mounted, ready, customerId, router]);

  const load = useCallback(() => apiFetch<Profile>('/me').then(setMe).catch((e) => toast.error(e.message)), []);
  useEffect(() => {
    if (customerId) load();
  }, [customerId, load]);

  // sliding tab indicator
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (el) {
      setInd({ left: el.offsetLeft, width: el.offsetWidth });
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [tab, me]);

  const goto = (id: Tab) => router.replace(`/account${id === 'overview' ? '' : `?tab=${id}`}`, { scroll: false });

  if (!mounted || !customerId) return <div className="container-x py-10"><TableSk /></div>;

  return (
    <div className="container-x pb-20 pt-6 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="stagger">
          <p className="eyebrow">{t('account.title')}</p>
          {me ? <h1 className="h-display mt-2 text-[40px] sm:text-[56px]">{t('account.hello', { name: me.name.split(' ')[0] || '' })}</h1> : <Sk className="mt-3 h-12 w-72" />}
          {me && <p className="mt-1 text-sm text-mocha">{t('account.memberSince')} {dateFmt(me.memberSince, lang)}</p>}
        </div>
        <button onClick={async () => { await logout(); window.location.replace('/'); }} className="btn-ghost !min-h-10"><LogOut className="h-4 w-4" /> {t('account.signOut')}</button>
      </div>

      <div ref={tabsRef} className="scrollbar-none relative mt-8 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map(({ id, icon: I }) => (
          <button key={id} data-tab={id} role="tab" aria-selected={tab === id} onClick={() => goto(id)} className={cn('flex min-h-12 shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors', tab === id ? 'text-espresso' : 'text-mocha hover:text-espresso')}>
            <I className="h-4 w-4" /> {t(`account.${id}`)}
          </button>
        ))}
        <span className="absolute bottom-0 h-0.5 rounded-full bg-gold transition-all duration-500 ease-[var(--ease-silk)]" style={{ left: ind.left, width: ind.width }} />
      </div>

      <div key={tab} className="mt-8 animate-page">
        {!me ? (
          <TableSk rows={4} />
        ) : tab === 'overview' ? (
          <Overview me={me} goto={goto} />
        ) : tab === 'orders' ? (
          <Orders />
        ) : tab === 'addresses' ? (
          <Addresses me={me} locations={locations} reload={load} />
        ) : tab === 'wishlist' ? (
          <Wishlist />
        ) : tab === 'rewards' ? (
          <Rewards me={me} />
        ) : (
          <ProfileForm me={me} onSaved={setMe} />
        )}
      </div>
    </div>
  );
}

function Overview({ me, goto }: { me: Profile; goto: (t: Tab) => void }) {
  const { t, lang } = useT();
  const stats = [
    { label: t('account.orders'), value: me.orderCount, fmt: (n: number) => num(Math.round(n), lang), tab: 'orders' as Tab, icon: Package },
    { label: t('account.totalSpent'), value: me.totalSpent, fmt: (n: number) => money(Math.round(n), lang), tab: 'orders' as Tab, icon: Star },
    { label: t('account.points'), value: me.loyaltyPoints, fmt: (n: number) => num(Math.round(n), lang), tab: 'rewards' as Tab, icon: Gift },
    { label: t('account.wishlist'), value: me.wishlistCount, fmt: (n: number) => num(Math.round(n), lang), tab: 'wishlist' as Tab, icon: Heart },
  ];
  return (
    <div className="space-y-8">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={() => goto(s.tab)} className="card lift group p-5 text-left">
            <s.icon className="h-5 w-5 text-bronze transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
            <p className="mt-4 font-display text-3xl sm:text-4xl"><CountUp value={s.value} format={s.fmt} /></p>
            <p className="mt-1 text-xs text-mocha">{s.label}</p>
          </button>
        ))}
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{lang === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent orders'}</h2>
          <button onClick={() => goto('orders')} className="btn-link">{t('common.viewAll')} <ChevronRight className="h-4 w-4" /></button>
        </div>
        <Orders limit={3} />
      </div>
    </div>
  );
}

function Orders({ limit }: { limit?: number }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState('all');
  const [list, setList] = useState<OrderView[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setList(null);
    apiFetch<OrderView[]>(`/me/orders${status !== 'all' ? `?status=${status}` : ''}`).then(setList).catch(() => setList([]));
  }, [status]);
  const paged = usePaged(limit ? null : list);
  const shown = limit ? list?.slice(0, limit) : paged.rows;
  const statusTone = (s: string) => (s === 'delivered' ? 'bg-success/15 text-success' : s === 'cancelled' || s === 'returned' ? 'bg-maroon/15 text-maroon' : s === 'shipped' ? 'bg-gold/20 text-bronze' : 'bg-sand text-espresso');
  return (
    <div>
      {!limit && (
        <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn('chip shrink-0', status === s && 'chip-on')}>{s === 'all' ? (lang === 'bn' ? 'সব' : 'All') : t(`order.statuses.${s}`)}</button>
          ))}
        </div>
      )}
      {!shown ? (
        <TableSk rows={3} />
      ) : shown.length === 0 ? (
        <div className="rounded-3xl bg-sand p-10 text-center">
          <Package className="mx-auto h-8 w-8 animate-float text-bronze" />
          <p className="mt-3 text-mocha">{t('account.noOrders')}</p>
          <Link href="/shop" className="btn-primary mt-5">{t('cart.continueShopping')}</Link>
        </div>
      ) : (
        <>
        <ul className="space-y-3">
          {shown.map((o, k) => (
            <li key={o.orderNo} className="card overflow-hidden" style={{ animation: `rise .5s var(--ease-silk) ${k * 60}ms both` }}>
              <button onClick={() => setOpen(open === o.orderNo ? null : o.orderNo)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-blush sm:p-5" aria-expanded={open === o.orderNo}>
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <span key={i.sku} className="media relative h-12 w-10 overflow-hidden rounded-lg ring-2 ring-surface"><Image src={i.image} alt="" fill sizes="40px" className="object-cover" /></span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">{o.orderNo}</p>
                  <p className="text-xs text-mocha">{dateFmt(o.createdAt, lang)} · {num(o.items.reduce((s, i) => s + i.qty, 0), lang)} {t('common.items')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{money(o.pricing.total, lang)}</p>
                  <span className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusTone(o.status))}>{t(`order.statuses.${o.status}`)}</span>
                </div>
                <ChevronRight className={cn('h-4 w-4 shrink-0 text-mocha transition-transform duration-500', open === o.orderNo && 'rotate-90')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-500 ease-[var(--ease-silk)]', open === o.orderNo ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">{open === o.orderNo && <div className="border-t border-line bg-blush p-3 sm:p-5"><OrderDetail o={o} /></div>}</div>
              </div>
            </li>
          ))}
        </ul>
        {!limit && <Pagination page={paged.page} pages={paged.pages} onPage={paged.setPage} />}
        </>
      )}
    </div>
  );
}

function Addresses({ me, locations, reload }: { me: Profile; locations: LocationTree[]; reload: () => void }) {
  const { t, lang } = useT();
  const [edit, setEdit] = useState<Partial<Addr> | null>(null);
  const del = async (id: string) => {
    await apiFetch(`/me/addresses/${id}`, { method: 'DELETE' }).catch((e) => toast.error(e.message));
    reload();
  };
  const makeDefault = async (id: string) => {
    await apiFetch(`/me/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } }).catch((e) => toast.error(e.message));
    reload();
  };
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {me.addresses.map((a, k) => (
          <div key={a.id} className={cn('card lift relative p-5', a.isDefault && 'border-gold')} style={{ animation: `rise .5s var(--ease-silk) ${k * 60}ms both` }}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{a.label}</p>
              {a.isDefault && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold text-bronze">{t('account.default')}</span>}
            </div>
            <p className="mt-2 text-sm text-mocha">{a.address}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.area}, {a.district}, {a.division}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setEdit(a)} className="chip !min-h-8 !text-xs"><Pencil className="h-3 w-3" /> {t('checkout.edit')}</button>
              {!a.isDefault && <button onClick={() => makeDefault(a.id)} className="chip !min-h-8 !text-xs">{t('account.makeDefault')}</button>}
              <button onClick={() => del(a.id)} className="chip !min-h-8 !text-xs hover:!border-maroon hover:text-maroon"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        {me.addresses.length < 6 && (
          <button onClick={() => setEdit({ label: lang === 'bn' ? 'বাসা' : 'Home' })} className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-mocha transition hover:border-bronze hover:text-espresso">
            <span className="flex flex-col items-center gap-2"><Plus className="h-6 w-6 transition-transform duration-500 hover:rotate-90" /> {t('account.addAddress')}</span>
          </button>
        )}
      </div>
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?.id ? t('checkout.edit') : t('account.addAddress')}>
        {edit && <AddressForm initial={edit} locations={locations} onDone={() => (setEdit(null), reload())} />}
      </Modal>
    </div>
  );
}

function AddressForm({ initial, locations, onDone }: { initial: Partial<Addr>; locations: LocationTree[]; onDone: () => void }) {
  const { t } = useT();
  const [a, setA] = useState({ label: '', division: '', district: '', area: '', address: '', landmark: '', isDefault: false, ...initial });
  const [busy, setBusy] = useState(false);
  const div = locations.find((d) => d.division === a.division);
  const dist = div?.districts.find((d) => d.name === a.district);
  const sel = (k: 'division' | 'district' | 'area', opts: string[]) => (
    <div>
      <label className="label" htmlFor={`a-${k}`}>{t(`checkout.${k}`)}</label>
      <select id={`a-${k}`} required value={a[k]} onChange={(e) => setA((s) => ({ ...s, [k]: e.target.value, ...(k === 'division' ? { district: '', area: '' } : k === 'district' ? { area: '' } : {}) }))} className="field">
        <option value="">{t('checkout.select')}</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const body = { label: a.label, division: a.division, district: a.district, area: a.area, address: a.address, landmark: a.landmark || undefined, isDefault: a.isDefault };
          await apiFetch(a.id ? `/me/addresses/${a.id}` : '/me/addresses', { method: a.id ? 'PATCH' : 'POST', body });
          toast.success(t('account.saved'));
          onDone();
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="a-label">{t('account.label')}</label>
        <input id="a-label" required maxLength={30} value={a.label} onChange={(e) => setA((s) => ({ ...s, label: e.target.value }))} className="field" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {sel('division', locations.map((l) => l.division))}
        {sel('district', div?.districts.map((d) => d.name) ?? [])}
        {sel('area', dist?.areas ?? [])}
      </div>
      <div>
        <label className="label" htmlFor="a-address">{t('checkout.address')}</label>
        <input id="a-address" required minLength={5} maxLength={200} value={a.address} onChange={(e) => setA((s) => ({ ...s, address: e.target.value }))} className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.isDefault} onChange={(e) => setA((s) => ({ ...s, isDefault: e.target.checked }))} className="h-4 w-4 accent-[var(--color-espresso)]" /> {t('account.makeDefault')}</label>
      <button disabled={busy} className="btn-primary h-12 w-full">{busy ? t('common.loading') : t('common.save')}</button>
    </form>
  );
}

function Wishlist() {
  const { t, lang } = useT();
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => {
    apiFetch<Product[]>('/me/wishlist').then(setItems).catch(() => setItems([]));
  }, []);
  if (!items) return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((k) => <Sk key={k} className="aspect-[3/4]" />)}</div>;
  if (!items.length) return <EmptyWish />;
  return <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p._id} p={p} lang={lang} />)}</div>;
  function EmptyWish() {
    return (
      <div className="rounded-3xl bg-sand p-10 text-center">
        <Heart className="mx-auto h-8 w-8 animate-pop text-maroon" />
        <p className="mt-3 text-mocha">{lang === 'bn' ? 'উইশলিস্ট খালি' : 'Your wishlist is empty'}</p>
        <Link href="/shop" className="btn-primary mt-5">{t('cart.continueShopping')}</Link>
      </div>
    );
  }
}

function Rewards({ me }: { me: Profile }) {
  const { t, lang } = useT();
  const tier = me.totalSpent >= 50000 ? 'Gold' : me.totalSpent >= 20000 ? 'Silver' : 'Bronze';
  const nextAt = tier === 'Bronze' ? 20000 : tier === 'Silver' ? 50000 : null;
  const pct = nextAt ? Math.min(100, (me.totalSpent / nextAt) * 100) : 100;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grain relative overflow-hidden rounded-3xl bg-night p-7 text-ivory">
        <div className="absolute -right-10 -top-10 h-48 w-48 animate-spin-slow rounded-full border border-gold/20" />
        <p className="eyebrow !text-gold">{tier} member</p>
        <p className="mt-4 font-display text-6xl"><CountUp value={me.loyaltyPoints} format={(n) => num(Math.round(n), lang)} /></p>
        <p className="mt-1 text-ivory/70">{t('account.points')} · {t('account.pointsWorth', { amount: money(me.loyaltyValue, lang) })}</p>
        {nextAt && (
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-ivory/15"><div className="h-full origin-left rounded-full bg-gold" style={{ width: `${pct}%`, animation: 'progress 1.4s var(--ease-silk) both' }} /></div>
            <p className="mt-2 text-xs text-ivory/60">{money(nextAt - me.totalSpent, lang)} {lang === 'bn' ? 'আরও কেনাকাটায় পরের লেভেল' : 'more to the next tier'}</p>
          </div>
        )}
      </div>
      <div className="card p-7">
        <p className="eyebrow">{t('account.referral')}</p>
        <button onClick={() => navigator.clipboard.writeText(me.referralCode).then(() => toast.info(t('common.copied')))} className="mt-4 flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-gold px-5 py-4 font-mono text-2xl font-bold tracking-[0.2em] transition active:scale-[.98]">
          {me.referralCode} <Copy className="h-5 w-5 text-bronze" />
        </button>
        <p className="mt-3 text-sm text-mocha">{t('account.referralNote')}</p>
        <p className="mt-6 text-xs text-mocha">{lang === 'bn' ? `প্রতি ৳১০০ কেনাকাটায় ${toBnDigits('1')} পয়েন্ট` : 'Earn 1 point for every ৳100 spent'}</p>
      </div>
    </div>
  );
}

function ProfileForm({ me, onSaved }: { me: Profile; onSaved: (p: Profile) => void }) {
  const { t, lang } = useT();
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const { setUser, user, logout } = useAuth();
  const [name, setName] = useState(me.name);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(me.email ?? '');
  const [emailPw, setEmailPw] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const emailChanged = email.trim().toLowerCase() !== (me.email ?? '').toLowerCase();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = await apiFetch<Profile>('/me', { method: 'PATCH', body: { name } });
            onSaved(p);
            if (user) setUser({ ...user, name: p.name });
            toast.success(t('account.saved'));
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="flex items-center gap-2 font-display text-2xl"><User className="h-5 w-5 text-bronze" /> {L('Personal details', 'ব্যক্তিগত তথ্য')}</h2>
        <TextField label={t('checkout.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        <TextField
          label={t('checkout.phone')}
          value={me.phone}
          disabled
          className="opacity-70"
          hint={<p className="mt-1.5 flex items-center gap-1 text-xs text-success"><ShieldCheck className="h-3.5 w-3.5" /> {L('Verified · used to sign in', 'যাচাইকৃত · সাইন ইনে ব্যবহার হয়')}</p>}
        />
        <button disabled={busy || name.trim().length < 2 || name === me.name} className="btn-primary">{busy ? t('common.loading') : t('common.save')}</button>
      </form>

      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setEmailBusy(true);
          setEmailErr('');
          try {
            const r = await apiFetch<{ user: NonNullable<typeof user> }>('/auth/email', { body: { email: email.trim(), password: emailPw } });
            setUser(r.user);
            onSaved({ ...me, email: r.user.email });
            setEmailPw('');
            toast.success(L('Email updated', 'ইমেইল আপডেট হয়েছে'));
          } catch (err) {
            setEmailErr(err instanceof ApiError ? err.message : t('errors.generic'));
          } finally {
            setEmailBusy(false);
          }
        }}
      >
        <h2 className="font-display text-2xl">{L('Sign-in email', 'সাইন-ইন ইমেইল')}</h2>
        <TextField label={L('Email', 'ইমেইল')} type="email" value={email} onChange={(e) => (setEmail(e.target.value), setEmailErr(''))} maxLength={120} autoComplete="email" />
        {emailChanged && (
          <div className="animate-scale-in">
            <PasswordField label={L('Confirm with your password', 'পাসওয়ার্ড দিয়ে নিশ্চিত করুন')} value={emailPw} onChange={(e) => (setEmailPw(e.target.value), setEmailErr(''))} autoComplete="current-password" maxLength={200} />
          </div>
        )}
        {emailErr && <p role="alert" className="animate-fade text-sm font-medium text-danger">{emailErr}</p>}
        <button disabled={!emailChanged || !emailPw || emailBusy} className="btn-primary">{emailBusy ? t('common.loading') : L('Update email', 'ইমেইল আপডেট')}</button>
      </form>

      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl"><KeyRound className="h-5 w-5 text-bronze" /> {L('Password', 'পাসওয়ার্ড')}</h2>
        {me.passwordChangedAt && <p className="mb-4 text-xs text-mocha">{L('Last changed', 'শেষ পরিবর্তন')}: {dateFmt(me.passwordChangedAt, lang)}</p>}
        <ChangePasswordForm endpoint="/auth/password/change" />
      </div>

      <div className="card flex flex-col p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl"><MonitorSmartphone className="h-5 w-5 text-bronze" /> {L('Devices', 'ডিভাইস')}</h2>
        <p className="text-sm text-mocha">{L('Signed in on a shared or lost phone? Sign out of every device at once — you will need your password again.', 'শেয়ার করা বা হারানো ফোনে সাইন ইন আছে? একসাথে সব ডিভাইস থেকে সাইন আউট করুন — আবার পাসওয়ার্ড লাগবে।')}</p>
        {me.lastLoginAt && <p className="mt-3 text-xs text-mocha">{L('Last sign-in', 'শেষ সাইন ইন')}: {dateFmt(me.lastLoginAt, lang)}</p>}
        <button
          onClick={async () => {
            await apiFetch('/auth/logout-all', { method: 'POST' }).catch(() => {});
            await logout();
            toast.info(L('Signed out of all devices', 'সব ডিভাইস থেকে সাইন আউট হয়েছে'));
            window.location.replace('/login');
          }}
          className="btn-ghost mt-auto !min-h-11 self-start text-danger"
        >
          <LogOut className="h-4 w-4" /> {L('Sign out everywhere', 'সব জায়গা থেকে সাইন আউট')}
        </button>
      </div>
    </div>
  );
}
