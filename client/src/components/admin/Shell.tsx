'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Boxes, ChevronDown, KeyRound, LogOut, RefreshCw, ServerOff, ClipboardList, DatabaseBackup, ExternalLink, FileClock, FolderTree, LayoutDashboard, Megaphone, Menu,
  MessageSquareQuote, Package, PanelsTopLeft, Radar, Settings, ShieldCheck, Tags, Users, UserCog, Zap,
} from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn } from '@/lib/format';
import { useStaffAuth, type AdminRole } from '@/store/auth';
import { ChangePasswordForm } from '../auth/ChangePassword';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { LangToggle } from '../layout/Header';
import { Logo } from '../ui/Logo';
import { Modal, Sheet } from '../ui/Sheet';
import { useCan, useL } from './lib';

type Item = { href: string; en: string; bn: string; icon: React.ComponentType<{ className?: string }>; perm: string };
const GROUPS: { en: string; bn: string; items: Item[] }[] = [
  { en: 'Overview', bn: 'ওভারভিউ', items: [
    { href: '/admin', en: 'Dashboard', bn: 'ড্যাশবোর্ড', icon: LayoutDashboard, perm: 'dashboard.view' },
    { href: '/admin/reports', en: 'Reports', bn: 'রিপোর্ট', icon: BarChart3, perm: 'reports.view' },
  ] },
  { en: 'Sales', bn: 'বিক্রি', items: [
    { href: '/admin/orders', en: 'Orders', bn: 'অর্ডার', icon: ClipboardList, perm: 'orders.view' },
    { href: '/admin/customers', en: 'Customers', bn: 'কাস্টমার', icon: Users, perm: 'customers.view' },
  ] },
  { en: 'Catalog', bn: 'ক্যাটালগ', items: [
    { href: '/admin/products', en: 'Products', bn: 'প্রোডাক্ট', icon: Package, perm: 'products.view' },
    { href: '/admin/categories', en: 'Categories', bn: 'ক্যাটাগরি', icon: FolderTree, perm: 'products.view' },
    { href: '/admin/inventory', en: 'Inventory', bn: 'ইনভেন্টরি', icon: Boxes, perm: 'products.view' },
    { href: '/admin/reviews', en: 'Reviews', bn: 'রিভিউ', icon: MessageSquareQuote, perm: 'products.view' },
  ] },
  { en: 'Growth', bn: 'গ্রোথ', items: [
    { href: '/admin/coupons', en: 'Coupons', bn: 'কুপন', icon: Tags, perm: 'marketing.manage' },
    { href: '/admin/flash-sales', en: 'Flash sales', bn: 'ফ্ল্যাশ সেল', icon: Zap, perm: 'marketing.manage' },
    { href: '/admin/marketing', en: 'Marketing & SMS', bn: 'মার্কেটিং ও SMS', icon: Megaphone, perm: 'marketing.manage' },
    { href: '/admin/tracking', en: 'Tracking events', bn: 'ট্র্যাকিং', icon: Radar, perm: 'reports.view' },
  ] },
  { en: 'Store', bn: 'স্টোর', items: [
    { href: '/admin/content', en: 'Homepage content', bn: 'হোমপেজ কনটেন্ট', icon: PanelsTopLeft, perm: 'cms.edit' },
    { href: '/admin/settings', en: 'Settings', bn: 'সেটিংস', icon: Settings, perm: 'settings.edit' },
    { href: '/admin/staff', en: 'Staff & roles', bn: 'স্টাফ ও রোল', icon: UserCog, perm: 'staff.manage' },
    { href: '/admin/audit', en: 'Audit log', bn: 'অডিট লগ', icon: FileClock, perm: 'audit.view' },
    { href: '/admin/backup', en: 'Backup', bn: 'ব্যাকআপ', icon: DatabaseBackup, perm: 'backup.manage' },
  ] },
];

function NavSk() {
  return (
    <div className="space-y-6" aria-hidden>
      {[3, 2, 4].map((n, g) => (
        <div key={g} className="space-y-2 px-3">
          <div className="h-2.5 w-16 animate-pulse rounded bg-sand" />
          {Array.from({ length: n }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-sand/70" />)}
        </div>
      ))}
    </div>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const L = useL();
  const can = useCan();
  return (
    <nav className="space-y-6" aria-label="Admin">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        return (
          <div key={g.en}>
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-mocha">{L(g.en, g.bn)}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const on = i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link href={i.href} onClick={onNavigate} aria-current={on ? 'page' : undefined} className={cn('group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-300', on ? 'bg-espresso font-semibold text-cream shadow-lg shadow-espresso/10' : 'text-mocha hover:bg-sand hover:text-espresso')}>
                      <i.icon className={cn('h-[18px] w-[18px] transition-transform duration-300', !on && 'group-hover:scale-110')} />
                      {L(i.en, i.bn)}
                      {on && <span className="absolute right-2.5 h-1.5 w-1.5 animate-pop rounded-full bg-gold" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

const ROLE_LABEL: Record<AdminRole, [string, string]> = {
  owner: ['Owner', 'মালিক'],
  manager: ['Manager', 'ম্যানেজার'],
  order_staff: ['Order staff', 'অর্ডার স্টাফ'],
  content_editor: ['Content editor', 'কনটেন্ট এডিটর'],
};

/** Signed-in staff member: role badge, change password, sign out. */
function UserMenu() {
  const L = useL();
  const staff = useStaffAuth((s) => s.staff);
  const logout = useStaffAuth((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  if (!staff) return <span className="h-10 w-36 animate-pulse rounded-full bg-sand" aria-hidden />;
  const initials = staff.name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [en, bn] = ROLE_LABEL[staff.role];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm transition hover:border-bronze/50">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/25 text-xs font-bold text-bronze">{initials}</span>
        <span className="hidden flex-col text-left leading-tight sm:flex"><span className="text-xs font-semibold">{staff.name}</span><span className="text-[10px] text-mocha"><ShieldCheck className="mr-0.5 inline h-3 w-3" />{L(en, bn)}</span></span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-cream shadow-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{staff.name}</p>
            <p className="truncate text-xs text-mocha">{staff.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-bronze"><ShieldCheck className="h-3 w-3" />{L(en, bn)}</span>
          </div>
          <button role="menuitem" onClick={() => (setOpen(false), setPwOpen(true))} className="flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-sand"><KeyRound className="h-4 w-4" />{L('Change password', 'পাসওয়ার্ড পরিবর্তন')}</button>
          <button role="menuitem" onClick={async () => { await logout(); window.location.replace('/admin/login'); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-danger transition hover:bg-danger/10"><LogOut className="h-4 w-4" />{L('Sign out', 'সাইন আউট')}</button>
        </div>
      )}
      <Modal open={pwOpen} onOpenChange={setPwOpen} title={L('Change password', 'পাসওয়ার্ড পরিবর্তন')}>
        <ChangePasswordForm endpoint="/admin/auth/password" admin onDone={() => setPwOpen(false)} />
      </Modal>
    </div>
  );
}

/** Shown instead of an endless skeleton when the Express API isn't running. */
function ApiOffline() {
  const L = useL();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto mt-10 max-w-lg animate-scale-in rounded-3xl border border-line bg-cream p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger"><ServerOff className="h-6 w-6" /></span>
      <h1 className="h-display mt-5 text-4xl">{L('API server is not running', 'API সার্ভার চালু নেই')}</h1>
      <p className="mt-3 text-sm text-mocha">{L('The admin needs the Ruposhi API on port 5000. Start it in a terminal, then retry:', 'অ্যাডমিন চালাতে পোর্ট 5000-এ Ruposhi API লাগবে। একটা terminal-এ চালু করে আবার চেষ্টা করুন:')}</p>
      <pre className="mt-4 rounded-xl bg-night px-4 py-3 text-left font-mono text-xs text-ivory">cd server{'\n'}npm run dev</pre>
      <button disabled={busy} onClick={async () => { setBusy(true); await useStaffAuth.getState().load(); setBusy(false); }} className="btn-primary mt-6">
        {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {L('Retry', 'আবার চেষ্টা')}
      </button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const L = useL();
  const { t } = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const staff = useStaffAuth((s) => s.staff);
  const offline = useStaffAuth((s) => s.offline);
  const bare = path === '/admin/login';
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!bare) useStaffAuth.getState().load();
  }, [bare]);
  if (bare) return <>{children}</>;
  return (
    <div className="min-h-dvh bg-blush/60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-cream lg:flex">
        <Link href="/admin" className="flex h-16 items-center gap-2 border-b border-line px-5"><Logo compact /><span className="font-display text-xl tracking-[0.2em]">ADMIN</span></Link>
        <div className="flex-1 overflow-y-auto px-3 py-5">{mounted && staff ? <Nav /> : <NavSk />}</div>
        <Link href="/" target="_blank" className="m-3 flex items-center justify-between rounded-xl bg-sand px-4 py-3 text-sm font-semibold transition hover:bg-gold/20">{L('View store', 'স্টোর দেখুন')} <ExternalLink className="h-4 w-4" /></Link>
      </aside>
      <div className="min-w-0 overflow-x-clip lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-cream/90 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label={t('nav.menu')}><Menu className="h-5 w-5" /></button>
          <Link href="/admin" className="lg:hidden"><Logo compact /></Link>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:block"><LangToggle /></span>
            <ThemeToggle />
            {mounted && <UserMenu />}
          </div>
        </header>
        <main key={path} className="animate-page px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{staff ? children : offline ? <ApiOffline /> : <div className="space-y-4" role="status" aria-label="Loading"><div className="h-10 w-64 animate-pulse rounded-xl bg-sand" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-sand" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-sand" /></div>}</main>
      </div>
      <Sheet open={open} onOpenChange={setOpen} side="left" title="Ruposhi Admin">
        <div className="space-y-5 p-4">
          {mounted && staff && <Nav onNavigate={() => setOpen(false)} />}
          <div className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3"><span className="text-sm font-semibold">Language</span><LangToggle /></div>
        </div>
      </Sheet>
    </div>
  );
}
