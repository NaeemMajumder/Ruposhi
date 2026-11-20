'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishState {
  ids: string[];
  recent: string[]; // recently viewed slugs
  toggle: (id: string) => boolean;
  has: (id: string) => boolean;
  setAll: (ids: string[]) => void;
  pushRecent: (slug: string) => void;
}

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      ids: [],
      recent: [],
      toggle: (id) => {
        const on = !get().ids.includes(id);
        set((s) => ({ ids: on ? [...s.ids, id] : s.ids.filter((x) => x !== id) }));
        return on;
      },
      has: (id) => get().ids.includes(id),
      setAll: (ids) => set({ ids }),
      pushRecent: (slug) => set((s) => ({ recent: [slug, ...s.recent.filter((x) => x !== slug)].slice(0, 12) })),
    }),
    { name: 'ruposhi-wishlist' },
  ),
);
