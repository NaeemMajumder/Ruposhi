'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetch } from '@/lib/client-api';
import { cn } from '@/lib/format';
import { track } from '@/lib/track';
import { useAuth } from '@/store/auth';
import { useWishlist } from '@/store/wishlist';
import { toast } from '../ui/Toast';
import { useT } from '@/i18n/client';

export function WishButton({ productId, className, name, withLabel }: { productId: string; className?: string; name: string; withLabel?: boolean }) {
  const { t } = useT();
  const toggle = useWishlist((s) => s.toggle);
  const on = useWishlist((s) => s.ids.includes(productId));
  const customerId = useAuth((s) => s.user?._id);
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  const active = m && on;
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = toggle(productId);
    if (now) {
      track('add_to_wishlist', { productSlug: productId });
      toast.success(`♡ ${name}`);
    }
    if (customerId) apiFetch(`/me/wishlist/${productId}`, { method: now ? 'POST' : 'DELETE' }).catch(() => {});
  };
  return (
    <button
      onClick={click}
      aria-pressed={active}
      aria-label={`${t('nav.wishlist')}: ${name}`}
      className={cn(
        withLabel ? 'btn-ghost !px-4' : 'grid h-10 w-10 place-items-center rounded-full bg-cream/90 shadow-sm backdrop-blur transition hover:scale-110 active:scale-90',
        className,
      )}
    >
      <Heart key={String(active)} className={cn('h-[18px] w-[18px] transition', active ? 'fill-maroon text-maroon motion-safe:animate-pop' : withLabel ? 'text-espresso' : 'text-[var(--color-espresso)]')} />
      {withLabel && <span>{t('nav.wishlist')}</span>}
    </button>
  );
}
