'use client';

// StoreApp — single-route SPA shell.
// Sandbox constraint: the preview only exposes the `/` route, so views
// (home / product / cart / checkout / success) are swapped client-side with
// AnimatePresence. In a standard deployment each view maps to an App Router
// segment (/product/[slug], /cart, /checkout).

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLangStore, useT } from '@/lib/i18n';
import { useUIStore } from '@/lib/store/ui';
import { useCartStore } from '@/lib/store/cart';
import { useMounted } from '@/hooks/use-mounted';
import { StoreHeader } from '@/components/store/header';
import { StoreFooter } from '@/components/store/footer';
import { CartDrawer } from '@/components/store/cart-drawer';
import { HomeView } from '@/components/store/views/home-view';
import { ProductView } from '@/components/store/views/product-view';
import { CartView } from '@/components/store/views/cart-view';
import { CheckoutView } from '@/components/store/views/checkout-view';
import { SuccessView } from '@/components/store/views/success-view';
import { viewTransition } from '@/components/store/motion';

function BrandSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold uppercase tracking-[0.3em]"
      >
        FORMA
      </motion.span>
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="text-xs uppercase tracking-widest text-muted-foreground"
      >
        Loading
      </motion.span>
    </div>
  );
}

export function StoreApp() {
  const lang = useLangStore((s) => s.lang);
  const view = useUIStore((s) => s.view);
  const mounted = useMounted();

  // Apply language + direction (RTL) to the document root.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Hydrate the cart from the WooGraphQL session (server cart).
  useEffect(() => {
    useCartStore.getState().refresh().catch(() => {
      /* offline or session expired — cart stays as-is / empty */
    });
  }, []);

  // Prevent body scroll while any sheet is open is handled by Radix.

  if (!mounted) {
    return <BrandSplash />;
  }

  const viewKey =
    view.name === 'product' ? `product-${view.slug}` : view.name === 'success' ? 'success' : view.name;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>

      <StoreHeader />

      <main id="main" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={viewKey} {...viewTransition}>
            {view.name === 'home' && <HomeView />}
            {view.name === 'product' && <ProductView slug={view.slug} />}
            {view.name === 'cart' && <CartView />}
            {view.name === 'checkout' && <CheckoutView />}
            {view.name === 'success' && (
              <SuccessView orderNumber={view.orderNumber} email={view.email} total={view.total} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <StoreFooter />
      <CartDrawer />
    </div>
  );
}
