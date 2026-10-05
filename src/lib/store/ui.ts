'use client';

// UI / navigation store.
// The storefront is a single-route SPA (sandbox constraint) — views are swapped
// with AnimatePresence. In production these would be /product/[slug], /cart and
// /checkout App Router segments.

import { create } from 'zustand';

export type View =
  | { name: 'home' }
  | { name: 'product'; slug: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'success'; orderNumber: string; email: string; total: number };

interface UIState {
  view: View;
  cartOpen: boolean;
  shopCategory: string | null; // category filter applied from home sections
  navigate: (view: View) => void;
  setCartOpen: (open: boolean) => void;
  setShopCategory: (slug: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  view: { name: 'home' },
  cartOpen: false,
  shopCategory: null,
  navigate: (view) => {
    set({ view });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },
  setCartOpen: (open) => set({ cartOpen: open }),
  setShopCategory: (slug) => set({ shopCategory: slug }),
}));
