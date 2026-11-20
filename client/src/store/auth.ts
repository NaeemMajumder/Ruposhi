'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { apiFetch } from '@/lib/client-api';

export type AdminRole = 'owner' | 'manager' | 'order_staff' | 'content_editor';
export type User = { _id: string; name: string; email: string; phone: string; phoneVerified: boolean; memberSince: string; loyaltyPoints: number };
export type StaffUser = { id: string; name: string; email: string; role: AdminRole; permissions: string[] | 'all' };
type Status = 'idle' | 'loading' | 'ready';

/**
 * Who is signed in. The truth lives in an httpOnly cookie the browser can't read,
 * so this store only mirrors `/auth/me` (customers) and `/admin/me` (staff). Nothing here is persisted.
 */
interface AuthState {
  user: User | null;
  status: Status;
  load: (force?: boolean) => Promise<User | null>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

let inflight: Promise<User | null> | null = null;

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',
  load: (force = false) => {
    if (!force && get().status === 'ready') return Promise.resolve(get().user);
    if (inflight) return inflight;
    set((s) => ({ status: s.status === 'ready' ? 'ready' : 'loading' }));
    inflight = apiFetch<{ user: User | null }>('/auth/me')
      .then((r) => r.user)
      .catch(() => null)
      .then((user) => {
        set({ user, status: 'ready' });
        inflight = null;
        return user;
      });
    return inflight;
  },
  setUser: (user) => set({ user, status: 'ready' }),
  logout: async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    set({ user: null, status: 'ready' });
  },
}));

/** Read the signed-in customer; fetches the session once per page load. */
export function useUser() {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  useEffect(() => {
    useAuth.getState().load();
  }, []);
  return { user, ready: status === 'ready' };
}

interface StaffState {
  staff: StaffUser | null;
  status: Status;
  /** true when the API server could not be reached at all (not running / network down) */
  offline: boolean;
  load: () => Promise<StaffUser | null>;
  setStaff: (s: StaffUser | null) => void;
  logout: () => Promise<void>;
}
let staffInflight: Promise<StaffUser | null> | null = null;

export const useStaffAuth = create<StaffState>()((set, get) => ({
  staff: null,
  status: 'idle',
  offline: false,
  load: () => {
    if (get().status === 'ready' && get().staff) return Promise.resolve(get().staff);
    if (staffInflight) return staffInflight;
    set({ status: 'loading', offline: false });
    // admin:true → an expired session redirects to /admin/login
    staffInflight = apiFetch<StaffUser>('/admin/me', { admin: true })
      .then((staff) => ({ staff, offline: false }))
      // 401 = signed out (handled by the redirect); 0 / 5xx from the proxy = API server not running
      .catch((e: { status?: number }) => ({ staff: null, offline: !e?.status || e.status >= 500 }))
      .then(({ staff, offline }) => {
        set({ staff, status: 'ready', offline });
        staffInflight = null;
        return staff;
      });
    return staffInflight;
  },
  setStaff: (staff) => set({ staff, status: 'ready' }),
  logout: async () => {
    await apiFetch('/admin/auth/logout', { method: 'POST' }).catch(() => {});
    set({ staff: null, status: 'ready' });
  },
}));
