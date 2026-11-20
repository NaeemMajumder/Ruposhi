'use client';
import { useRef, useState } from 'react';
import { BadgeCheck, PenLine, Star } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, num, toBnDigits } from '@/lib/format';
import { shake } from '@/lib/motion';
import type { Review } from '@/lib/types';
import { Modal } from '../ui/Sheet';
import { Stars } from '../ui/Price';
import { toast } from '../ui/Toast';

type Summary = { items: Review[]; total: number; average: number; count: number; breakdown: { star: number; count: number }[] };

export function Reviews({ slug, data }: { slug: string; data: Summary | null }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(data?.items ?? []);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const total = data?.total ?? 0;
  const avg = data?.average ?? 0;
  const max = Math.max(1, ...(data?.breakdown ?? []).map((b) => b.count));

  const more = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<Summary>(`/products/${slug}/reviews?limit=6&page=${page + 1}`);
      setItems((x) => [...x, ...r.items]);
      setPage((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-line py-14 sm:py-20" aria-labelledby="reviews-h">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr] lg:gap-16">
        <div data-reveal>
          <p className="eyebrow">{t('product.reviews')}</p>
          <h2 id="reviews-h" className="h-display mt-3 text-5xl">{lang === 'bn' ? toBnDigits(avg.toFixed(1)) : avg.toFixed(1)}<span className="text-2xl text-mocha"> / {lang === 'bn' ? '৫' : '5'}</span></h2>
          <Stars value={avg} size={18} className="mt-2" />
          <p className="mt-1 text-sm text-mocha">{num(data?.count ?? 0, lang)} {t('common.reviews')}</p>
          <ul className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((s) => {
              const c = data?.breakdown.find((b) => b.star === s)?.count ?? 0;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-6 tabular-nums">{lang === 'bn' ? toBnDigits(String(s)) : s}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                    <span className="block h-full origin-left rounded-full bg-gold" style={{ width: `${(c / max) * 100}%`, animation: 'progress 1.1s var(--ease-silk) both' }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-mocha">{num(c, lang)}</span>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setOpen(true)} className="btn-ghost mt-8 w-full"><PenLine className="h-4 w-4" /> {t('product.writeReview')}</button>
        </div>
        <div>
          {items.length === 0 ? (
            <p className="rounded-2xl bg-sand p-8 text-center text-mocha">{t('product.noReviews')}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((r, k) => (
                <li key={r._id} className="card lift animate-scale-in p-5" style={{ animationDelay: `${(k % 6) * 60}ms` }}>
                  <div className="flex items-center justify-between gap-2">
                    <Stars value={r.rating} />
                    <time className="text-xs text-mocha" dateTime={r.createdAt}>{dateFmt(r.createdAt, lang)}</time>
                  </div>
                  {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                  <p className="mt-1.5 text-sm leading-relaxed text-mocha">{r.body}</p>
                  <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold">
                    {r.customerName}
                    {r.verified && <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><BadgeCheck className="h-3.5 w-3.5" /> {t('product.verified')}</span>}
                  </p>
                  {r.reply && <p className="mt-3 rounded-xl bg-blush p-3 text-sm"><span className="font-semibold">Ruposhi:</span> {r.reply}</p>}
                </li>
              ))}
            </ul>
          )}
          {items.length < total && (
            <button onClick={more} disabled={busy} className="btn-ghost mx-auto mt-8 flex">{busy ? t('common.loading') : t('shop.loadMore')}</button>
          )}
        </div>
      </div>
      <Modal open={open} onOpenChange={setOpen} title={t('product.writeReview')}>
        <ReviewForm slug={slug} onDone={() => setOpen(false)} />
      </Modal>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { t } = useT();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body = Object.fromEntries(f.entries());
        setBusy(true);
        setErrors({});
        try {
          await apiFetch(`/products/${slug}/reviews`, { body: { ...body, rating, orderNo: body.orderNo || undefined } });
          toast.success(t('product.reviewThanks'));
          onDone();
        } catch (err) {
          shake(ref.current);
          if (err instanceof ApiError && Array.isArray(err.details)) {
            setErrors(Object.fromEntries((err.details as { path: string; message: string }[]).map((d) => [d.path, d.message])));
          }
          toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <span className="label">{t('product.rating')}</span>
        <div className="flex gap-1" role="radiogroup" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button type="button" key={s} role="radio" aria-checked={rating === s} aria-label={`${s} stars`} onMouseEnter={() => setHover(s)} onClick={() => setRating(s)} className="p-1 transition hover:scale-125 active:scale-90">
              <Star className={cn('h-8 w-8 transition-colors', (hover || rating) >= s ? 'fill-gold text-gold' : 'text-line')} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t('product.reviewName')} error={errors.name} required maxLength={60} autoComplete="name" />
        <Field name="phone" label={t('product.reviewPhone')} error={errors.phone} required inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />
      </div>
      <Field name="orderNo" label={t('product.reviewOrder')} error={errors.orderNo} placeholder="RP-…" maxLength={30} />
      <Field name="title" label={t('product.reviewTitle')} error={errors.title} required maxLength={100} />
      <div>
        <label className="label" htmlFor="rv-body">{t('product.reviewBody')}</label>
        <textarea id="rv-body" name="body" required minLength={10} maxLength={1500} rows={4} className={cn('field', errors.body && '!border-danger')} />
        {errors.body && <p className="mt-1 text-xs text-danger">{errors.body}</p>}
      </div>
      <button disabled={busy} className="btn-primary h-12 w-full">{busy ? t('common.loading') : t('common.submit')}</button>
    </form>
  );
}

function Field({ label, error, name, ...rest }: { label: string; error?: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={`rv-${name}`}>{label}</label>
      <input id={`rv-${name}`} name={name} {...rest} aria-invalid={!!error} className={cn('field', error && '!border-danger')} />
      {error && <p className="mt-1 animate-fade text-xs text-danger">{error}</p>}
    </div>
  );
}
