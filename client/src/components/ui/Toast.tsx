'use client';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; message: string; leaving?: boolean }

const useToasts = create<{ items: ToastItem[]; push: (k: Kind, m: string) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { id, kind, message }] }));
    setTimeout(() => useToasts.getState().drop(id), 4200);
  },
  // two-phase removal so the exit animation can play
  drop: (id) => {
    set((s) => ({ items: s.items.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 260);
  },
}));

export const toast = {
  success: (m: string) => useToasts.getState().push('success', m),
  error: (m: string) => useToasts.getState().push('error', m),
  info: (m: string) => useToasts.getState().push('info', m),
};

export function Toaster() {
  const { items, drop } = useToasts();
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6" role="status" aria-live="polite">
      {items.map((t) => {
        const I = Icon[t.kind];
        return (
          <div key={t.id} style={{ animation: t.leaving ? 'toastOut .26s var(--ease-in-soft) forwards' : 'toastIn .45s var(--ease-silk) both' }} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-espresso px-4 py-3 text-sm text-cream shadow-xl">
            <I className={`mt-0.5 h-5 w-5 shrink-0 ${t.kind === 'error' ? 'text-[#f2a7a7]' : 'text-gold'}`} aria-hidden="true" />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => drop(t.id)} className="-m-1 p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
