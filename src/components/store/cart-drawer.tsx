'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCartStore, useCartSubtotal } from '@/lib/store/cart';
import { useUIStore } from '@/lib/store/ui';
import { useT, usePriceFormatter } from '@/lib/i18n';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/types';

export function CartDrawer() {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const isRTL = useT().isRTL;
  const open = useUIStore((s) => s.cartOpen);
  const setOpen = useUIStore((s) => s.setCartOpen);
  const navigate = useUIStore((s) => s.navigate);
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.remove);
  const syncing = useCartStore((s) => s.syncing);
  const subtotal = useCartSubtotal();

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const count = lines.reduce((a, l) => a + l.quantity, 0);

  const goCart = () => {
    setOpen(false);
    navigate({ name: 'cart' });
  };
  const goCheckout = () => {
    setOpen(false);
    navigate({ name: 'checkout' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="size-4" />
            {t.cart_title}
            {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </SheetTitle>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)} aria-label={t.close}>
            <X className="size-4" />
          </Button>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="font-medium">{t.cart_empty}</p>
            <p className="text-sm text-muted-foreground">{t.cart_empty_desc}</p>
            <Button onClick={goCart} variant="outline" className="mt-2 rounded-full">
              {t.cart_empty_cta}
            </Button>
          </div>
        ) : (
          <>
            {/* free shipping progress */}
            <div className="border-b px-5 py-3">
              <p className="mb-2 text-xs text-muted-foreground">
                {remaining > 0
                  ? t.free_shipping_progress.replace('{amount}', formatPrice(remaining))
                  : t.free_shipping_unlocked}
              </p>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* lines */}
            <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-5">
                {lines.map((line) => (
                  <motion.li
                    key={line.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate({ name: 'product', slug: line.slug });
                      }}
                      className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted/40"
                      aria-label={line.name}
                    >
                      <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">{line.name}</p>
                        <button
                          onClick={() => {
                            remove(line.key)
                              .then(() => toast(t.item_removed, { description: line.name }))
                              .catch(() => toast.error(t.cart_sync_error));
                          }}
                          disabled={syncing}
                          className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                          aria-label={`${t.remove_item}: ${line.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {Object.entries(line.options).length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {Object.entries(line.options)
                            .map(([, v]) => v)
                            .join(' · ')}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-full border">
                          <button
                            onClick={() =>
                              updateQuantity(line.key, line.quantity - 1).catch(() =>
                                toast.error(t.cart_sync_error)
                              )
                            }
                            disabled={syncing}
                            className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
                            aria-label={`${t.quantity} -1`}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-medium tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(line.key, line.quantity + 1).catch(() =>
                                toast.error(t.cart_sync_error)
                              )
                            }
                            disabled={syncing || line.quantity >= line.maxQuantity}
                            className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
                            aria-label={`${t.quantity} +1`}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* footer */}
            <div className="space-y-3 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.subtotal}</span>
                <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.cart_note}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" className="rounded-full" onClick={goCart}>
                  {t.cart_view}
                </Button>
                <Button className="rounded-full" onClick={goCheckout}>
                  {t.checkout}
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

