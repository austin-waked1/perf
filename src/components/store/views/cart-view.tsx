'use client';

// Cart view — full-page cart with line management and order summary.

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCartStore, useCartSubtotal } from '@/lib/store/cart';
import { useUIStore } from '@/lib/store/ui';
import { useT, usePriceFormatter } from '@/lib/i18n';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/types';

export function CartView() {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.remove);
  const syncing = useCartStore((s) => s.syncing);
  const subtotal = useCartSubtotal();

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-9 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">{t.cart_empty}</h1>
        <p className="text-sm text-muted-foreground">{t.cart_empty_desc}</p>
        <Button size="lg" className="mt-2 rounded-full px-8" onClick={() => navigate({ name: 'home' })}>
          {t.cart_empty_cta}
        </Button>
      </div>
    );
  }

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const count = lines.reduce((a, l) => a + l.quantity, 0);

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
          {t.cart_title} <span className="text-muted-foreground">({count})</span>
        </h1>
        <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => navigate({ name: 'home' })}>
          <X className="size-4" />
          {t.continue_shopping}
        </Button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* lines */}
        <ul className="space-y-4">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.li
                key={line.key}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-4 overflow-hidden rounded-3xl border p-4"
              >
                <button
                  onClick={() => navigate({ name: 'product', slug: line.slug })}
                  className="relative size-24 shrink-0 overflow-hidden rounded-2xl border bg-muted/40 sm:size-28"
                  aria-label={line.name}
                >
                  <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover" />
                </button>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate({ name: 'product', slug: line.slug })}
                        className="line-clamp-1 text-start font-medium hover:underline"
                      >
                        {line.name}
                      </button>
                      {Object.entries(line.options).length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Object.entries(line.options)
                            .map(([, v]) => v)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        remove(line.key)
                          .then(() => toast(t.item_removed, { description: line.name }))
                          .catch(() => toast.error(t.cart_sync_error));
                      }}
                      disabled={syncing}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      aria-label={`${t.remove_item}: ${line.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex h-9 items-center rounded-full border">
                      <button
                        onClick={() =>
                          updateQuantity(line.key, line.quantity - 1).catch(() =>
                            toast.error(t.cart_sync_error)
                          )
                        }
                        disabled={syncing}
                        className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
                        aria-label={`${t.quantity} -1`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <Input
                        readOnly
                        value={line.quantity}
                        aria-label={t.quantity}
                        className="h-9 w-10 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(line.key, line.quantity + 1).catch(() =>
                            toast.error(t.cart_sync_error)
                          )
                        }
                        disabled={syncing || line.quantity >= line.maxQuantity}
                        className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
                        aria-label={`${t.quantity} +1`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="text-end">
                      <p className="font-semibold tabular-nums">{formatPrice(line.price * line.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(line.price)} × {line.quantity}</p>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-3xl border bg-card p-6">
            <h2 className="font-semibold">{t.order_summary}</h2>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.subtotal}</span>
              <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.shipping_label}</span>
              <span className="text-sm text-muted-foreground">{t.cart_note}</span>
            </div>
            {remaining > 0 && (
              <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                {t.free_shipping_progress.replace('{amount}', formatPrice(remaining))}
              </p>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.total}</span>
              <span className="text-xl font-bold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <Button
              size="lg"
              className="h-12 w-full rounded-full font-semibold"
              onClick={() => navigate({ name: 'checkout' })}
            >
              {t.checkout}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full text-muted-foreground"
              onClick={() => setCartOpen(true)}
            >
              {t.cart_view}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
