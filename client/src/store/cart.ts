'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { I18n } from '@/lib/types';

export interface CartItem {
  slug: string;
  sku: string;
  qty: number;
  name: I18n;
  image: string;
  price: number;
  size: string;
  color: string;
  preOrder?: boolean;
}

interface CartState {
  items: CartItem[];
  couponCode: string;
  giftWrap: boolean;
  open: boolean;
  add: (item: CartItem, openDrawer?: boolean) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  setCoupon: (c: string) => void;
  setGiftWrap: (v: boolean) => void;
  setOpen: (v: boolean) => void;
}

/** Cart lives in the browser; every price is re-validated by the API (/cart/quote) before showing totals. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: '',
      giftWrap: false,
      open: false,
      add: (item, openDrawer = true) =>
        set((s) => {
          const existing = s.items.find((i) => i.sku === item.sku);
          const items = existing
            ? s.items.map((i) => (i.sku === item.sku ? { ...i, qty: Math.min(10, i.qty + item.qty) } : i))
            : [...s.items, { ...item, qty: Math.min(10, item.qty) }];
          return openDrawer ? { items, open: true } : { items };
        }),
      setQty: (sku, qty) => set((s) => ({ items: s.items.map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i)) })),
      remove: (sku) => set((s) => ({ items: s.items.filter((i) => i.sku !== sku) })),
      clear: () => set({ items: [], couponCode: '', giftWrap: false }),
      setCoupon: (couponCode) => set({ couponCode }),
      setGiftWrap: (giftWrap) => set({ giftWrap }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'ruposhi-cart', partialize: (s) => ({ items: s.items, couponCode: s.couponCode, giftWrap: s.giftWrap }) },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((s, i) => s + i.qty * i.price, 0);
