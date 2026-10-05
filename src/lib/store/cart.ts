'use client';

// Cart store — single source of truth for the cart UI.
//
// The cart is the WooGraphQL server-side session cart. Mutations hit the
// live WordPress endpoint; every mutation response returns the full cart,
// which becomes the authoritative state (lines + totals). Updates are
// optimistic locally, then reconciled with the server snapshot.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  wpAddToCart,
  wpFetchCart,
  wpRemoveItems,
  wpUpdateQuantity,
} from '@/lib/commerce';
import type { CartLine, CartTotals, Product } from '@/lib/types';

function lineKey(productId: string, options: Record<string, string>): string {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}:${options[k]}`)
    .join('|');
  return opts ? `${productId}__${opts}` : productId;
}

interface CartState {
  lines: CartLine[];
  /** Totals from the Woo cart session. */
  server: CartTotals | null;
  /** True while a server cart mutation is in flight. */
  syncing: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /** Resolves false when the add failed (server error). */
  add: (product: Product, options: Record<string, string>, quantity: number) => Promise<boolean>;
  updateQuantity: (key: string, quantity: number) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => void;
  /** Pull the authoritative server cart (bootstrap / resync). */
  refresh: () => Promise<void>;
}

function applySnapshot(state: CartState, snap: { lines: CartLine[]; totals: CartTotals | null }) {
  return { lines: snap.lines, server: snap.totals, syncing: false };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      server: null,
      syncing: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      add: async (product, options, quantity) => {
        // WooGraphQL addToCart, response is the authoritative cart.
        set({ syncing: true });
        try {
          const snap = await wpAddToCart(product, options, quantity);
          set(applySnapshot(get(), snap));
          return true;
        } catch (err) {
          set({ syncing: false });
          throw err;
        }
      },

      updateQuantity: async (key, quantity) => {
        const target = get().lines.find((l) => l.key === key);
        if (!target) return;

        // Optimistic local update, then reconcile with the server cart.
        const clamped = Math.max(0, Math.min(quantity, target.maxQuantity));
        set({
          lines: get()
            .lines.map((l) => (l.key === key ? { ...l, quantity: clamped } : l))
            .filter((l) => l.quantity > 0),
          syncing: true,
        });

        try {
          if (clamped === 0) {
            const snap = await wpRemoveItems([key]);
            set(applySnapshot(get(), snap));
          } else {
            const snap = await wpUpdateQuantity(key, clamped);
            set(applySnapshot(get(), snap));
          }
        } catch (err) {
          set({ syncing: false });
          try {
            await get().refresh(); // resync to server truth
          } catch {
            /* offline — keep optimistic lines */
          }
          throw err;
        }
      },

      remove: async (key) => {
        // Optimistic removal, then reconcile with the server cart.
        set({ lines: get().lines.filter((l) => l.key !== key), syncing: true });
        try {
          const snap = await wpRemoveItems([key]);
          set(applySnapshot(get(), snap));
        } catch (err) {
          set({ syncing: false });
          try {
            await get().refresh();
          } catch {
            /* offline — keep optimistic lines */
          }
          throw err;
        }
      },

      // Called after a successful checkout (server cart is emptied there).
      clear: () => set({ lines: [], server: null, syncing: false }),

      refresh: async () => {
        const snap = await wpFetchCart();
        set({ lines: snap.lines, server: snap.totals, syncing: false });
      },
    }),
    {
      name: 'forma-cart',
      storage: createJSONStorage(() => localStorage),
      // Only lines persist locally; server totals are always refetched.
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useCartCount(): number {
  return useCartStore((s) => s.lines.reduce((acc, l) => acc + l.quantity, 0));
}

export function useCartSubtotal(): number {
  return useCartStore((s) => {
    // Prefer the server-computed subtotal (includes store rules).
    if (s.server) return s.server.subtotal;
    return s.lines.reduce((acc, l) => acc + l.price * l.quantity, 0);
  });
}
