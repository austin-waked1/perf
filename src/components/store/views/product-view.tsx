'use client';

// Product detail view — editorial split with a direction-LOCKED arrangement:
//   • LEFT half: full-height gallery stack the page scrolls THROUGH, each
//     frame subtly parallax-scaled, with a floating thumbnail pill and an
//     image counter chip;
//   • RIGHT half: a FIXED-size info card (Prada-style constant width) that
//     is centered horizontally + vertically and scrolls internally — the
//     grid carries dir="ltr" so images stay left / card stays right in both
//     languages, and the card re-applies dir so Arabic text reads RTL.

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { findVariation } from '@/lib/commerce';
import { useProduct } from '@/hooks/use-commerce';
import { useUIStore } from '@/lib/store/ui';
import { useCartStore } from '@/lib/store/cart';
import { useT, usePriceFormatter, useLangStore } from '@/lib/i18n';
import { ProductCard } from '@/components/store/product-card';
import { ProductPageSkeleton } from '@/components/store/skeletons';
import { fadeUp, staggerContainer } from '@/components/store/motion';
import { defaultOptionsFor, isSelectionComplete } from '@/components/store/options';
import type { FragranceDetails, Product, StockStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

function StockDot({ status, quantity }: { status: StockStatus; quantity: number | null }) {
  const { t } = useT();
  const map = {
    IN_STOCK: { label: t.in_stock, cls: 'bg-emerald-500' },
    LOW_STOCK: {
      label: t.low_stock.replace('{count}', String(quantity ?? 0)),
      cls: 'bg-amber-500',
    },
    OUT_OF_STOCK: { label: t.out_of_stock, cls: 'bg-red-500' },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cn('size-2 rounded-full', s.cls)} />
      {s.label}
    </span>
  );
}

/* ── gallery ─────────────────────────────────────────────────────────────── */

type FrameKind = 'full' | 'detail-a' | 'detail-b';

// One full-height frame inside the scroll-through stack. The photo is scaled
// 1.08 → 1.00 → 1.08 across its scroll journey (settle-at-center parallax),
// which gives the page its editorial "motion without gimmicks" feel.
function GalleryBlock({
  src,
  alt,
  kind,
  index,
  total,
  priority,
  registerRef,
  badge,
}: {
  src: string;
  alt: string;
  kind: FrameKind;
  index: number;
  total: number;
  priority: boolean;
  registerRef: (i: number, el: HTMLDivElement | null) => void;
  badge?: React.ReactNode;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: blockRef,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduceMotion ? [1, 1, 1] : [1.08, 1, 1.08]
  );

  useEffect(() => {
    registerRef(index, blockRef.current);
    return () => registerRef(index, null);
  }, [index, registerRef]);

  return (
    <div
      ref={blockRef}
      data-index={index}
      className="group relative h-[72svh] overflow-hidden rounded-2xl border bg-muted/40 will-change-transform lg:h-[calc(100svh-5.25rem)] lg:rounded-3xl"
    >
      <motion.div style={{ scale }} className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 55vw"
          className={cn(
            'object-cover',
            kind === 'detail-a' && 'scale-[1.75] object-[50%_22%]',
            kind === 'detail-b' && 'scale-[1.75] object-[50%_78%]',
            kind === 'full' &&
              'transition-transform duration-700 ease-out group-hover:scale-[1.04]'
          )}
        />
      </motion.div>

      {badge}
      {total > 1 && (
        <div
          dir="ltr"
          className="absolute end-4 top-4 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold tabular-nums backdrop-blur"
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      )}
    </div>
  );
}

function GalleryStack({
  product,
  saleBadge,
}: {
  product: Product;
  saleBadge?: { price: number; regularPrice: number } | null;
}) {
  // Stack = featured image + WP gallery images, enriched with variation
  // shots (each size carries its own Woo media). Catalog media is sparse —
  // most products own a single photo — so shorter sets are padded with
  // editorial DETAIL crops of the primary shot (zoomed top / zoomed base),
  // mirroring how the reference template shows one product from several
  // distances. Every frame stays real product imagery — nothing faked.
  const frames = useMemo(() => {
    const base = product.gallery.length > 0 ? [...product.gallery] : [product.image];
    for (const v of product.variations ?? []) {
      if (v.image && v.image.startsWith('http') && !base.includes(v.image)) {
        base.push(v.image);
      }
    }
    const out: { src: string; kind: FrameKind }[] = base
      .slice(0, 4)
      .map((src) => ({ src, kind: 'full' as const }));
    const primary = base[0];
    if (out.length < 2 && primary) out.push({ src: primary, kind: 'detail-a' });
    if (out.length < 3 && primary) out.push({ src: primary, kind: 'detail-b' });
    return out;
  }, [product]);
  const [active, setActive] = useState(0);
  const framesRef = useRef<(HTMLDivElement | null)[]>([]);
  const total = frames.length;

  const registerRef = useCallback((i: number, el: HTMLDivElement | null) => {
    framesRef.current[i] = el;
  }, []);

  // Track which frame owns the viewport center → drives the active thumbnail.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { threshold: 0.55 }
    );
    framesRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [total]);

  const jumpTo = (i: number) => {
    framesRef.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const badge = saleBadge && saleBadge.regularPrice > 0 && (
    <Badge className="absolute start-4 top-4 border-0 bg-accent-brand text-white hover:bg-accent-brand">
      <span dir="ltr">
        {`-${Math.round((1 - saleBadge.price / saleBadge.regularPrice) * 100)}%`}
      </span>
    </Badge>
  );

  return (
    <div className="relative">
      <div className="flex flex-col gap-2 lg:gap-3 lg:pb-3 lg:pt-3">
        {frames.map((frame, i) => (
          <GalleryBlock
            key={`${frame.src}-${frame.kind}-${i}`}
            src={frame.src}
            alt={
              frame.kind === 'full'
                ? `${product.name} — ${i + 1}`
                : `${product.name} — detail`
            }
            kind={frame.kind}
            index={i}
            total={total}
            priority={i === 0}
            registerRef={registerRef}
            badge={i === 0 ? badge : undefined}
          />
        ))}
      </div>

      {/* floating thumbnail pill — sticks to the viewport bottom while the
          stack scrolls past, then settles back into flow at the end */}
      {total > 1 && (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center lg:bottom-6">
          <div
            role="tablist"
            aria-label="Product images"
            className="pointer-events-auto flex gap-1.5 rounded-2xl border bg-background/85 p-1.5 shadow-xl shadow-black/5 backdrop-blur-md"
          >
            {frames.map((frame, i) => (
              <button
                key={`${frame.src}-${frame.kind}-${i}`}
                role="tab"
                aria-selected={i === active}
                aria-label={`Image ${i + 1}`}
                onClick={() => jumpTo(i)}
                className={cn(
                  'relative size-12 overflow-hidden rounded-xl transition-all duration-300 lg:size-14',
                  i === active
                    ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                <Image
                  src={frame.src}
                  alt=""
                  fill
                  sizes="56px"
                  className={cn(
                    'object-cover',
                    frame.kind === 'detail-a' && 'scale-[1.75] object-[50%_22%]',
                    frame.kind === 'detail-b' && 'scale-[1.75] object-[50%_78%]'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── black feature marquee ───────────────────────────────────────────────── */

function FeatureMarquee({ items }: { items: { Icon: LucideIcon; label: string }[] }) {
  const lang = useLangStore((s) => s.lang);
  const isRTL = lang === 'ar';
  return (
    <div dir="ltr" className="overflow-hidden rounded-full bg-foreground py-2.5 text-background">
      <motion.div
        className="flex w-max will-change-transform"
        animate={{ x: isRTL ? ['-33.333%', '0%'] : ['0%', '-33.333%'] }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
      >
        {[0, 1, 2].map((copy) => (
          <div key={copy} aria-hidden={copy > 0} className="flex items-center gap-10 pe-10">
            {items.map(({ Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-2 whitespace-nowrap text-xs font-medium tracking-wide"
              >
                <Icon className="size-4" />
                {label}
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── accordion card ──────────────────────────────────────────────────────── */

function AccordionCard({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="rounded-2xl border-0 bg-background/70 px-5 transition-colors hover:bg-background"
    >
      <AccordionTrigger className="py-3.5 text-sm font-semibold hover:no-underline [&>svg:last-child]:hidden">
        {title}
        <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-45" />
      </AccordionTrigger>
      <AccordionContent className="pb-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

/* ── fragrance notes (ACF) ─────────────────────────────────────────────── */
/* Editorial definition rows with a thin sillage bar. Renders only rows
   carrying data, so it disappears cleanly when a product has no ACF data. */

function FragranceNotes({ fragrance }: { fragrance: FragranceDetails }) {
  const { t } = useT();
  const rows: { label: string; notes: string[] }[] = [
    { label: t.fragrance_top, notes: fragrance.topNotes },
    { label: t.fragrance_heart, notes: fragrance.heartNotes },
    { label: t.fragrance_base, notes: fragrance.baseNotes },
  ].filter((r) => r.notes.length > 0);

  return (
    <motion.div variants={fadeUp} aria-label={t.fragrance_title} className="mt-2 border-t border-border/70 pt-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {t.fragrance_title}
      </p>

      {rows.length > 0 && (
        <dl className="mt-3.5 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-6">
              <dt className="whitespace-nowrap text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-end text-sm text-foreground">{row.notes.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      )}

      {fragrance.sillageValue != null && (
        <div className={cn(rows.length > 0 && 'mt-4 border-t border-border/50 pt-3.5')}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{t.fragrance_sillage}</span>
            <span className="text-sm font-medium tabular-nums" dir="ltr">
              {fragrance.sillageValue}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={fragrance.sillageValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.fragrance_sillage}
            className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-background"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fragrance.sillageValue}%` }}
              transition={{ duration: 1, ease: [0.215, 0.61, 0.355, 1], delay: 0.2 }}
              className="h-full rounded-full bg-foreground"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── view ────────────────────────────────────────────────────────────────── */

export function ProductView({ slug }: { slug: string }) {
  const { t, isRTL } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);
  const setShopCategory = useUIStore((s) => s.setShopCategory);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const add = useCartStore((s) => s.add);
  const { data, isPending, isError } = useProduct(slug);

  const [selected, setSelected] = useState<Record<string, string> | null>(null);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);

  const product = data?.product;

  // effective selection: user selection, or defaults once product loads
  const effective = useMemo(() => {
    if (!product) return {};
    return selected ?? defaultOptionsFor(product);
  }, [product, selected]);

  // The variation matching the current selection — drives the displayed price,
  // regular price, sale badge and stock. Re-resolves on every option change.
  const matchedVariation = useMemo(
    () => (product ? findVariation(product, effective) : null),
    [product, effective]
  );

  const maxQty = product
    ? Math.max(1, matchedVariation?.stockQuantity ?? product.stockQuantity)
    : 99;

  // Keep the quantity valid when switching between variations.
  useEffect(() => {
    setQty((q) => Math.min(maxQty, Math.max(1, q)));
  }, [maxQty]);

  const marqueeItems = useMemo(
    () => [
      { Icon: Truck, label: t.prop_shipping_title },
      { Icon: RotateCcw, label: t.prop_returns_title },
      { Icon: ShieldCheck, label: t.prop_secure_title },
      { Icon: CreditCard, label: t.cod },
    ],
    [t]
  );

  if (isPending) {
    return (
      <div className="py-6">
        <div className="px-4 md:px-8">
          <div className="mb-6 h-9 w-40 animate-pulse rounded-full bg-muted" />
        </div>
        <ProductPageSkeleton />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-32 text-center">
        <p className="text-lg font-semibold">{t.error_title}</p>
        <p className="text-sm text-muted-foreground">{t.error_desc}</p>
        <Button className="rounded-full" onClick={() => navigate({ name: 'home' })}>
          {t.back_to_shop}
        </Button>
      </div>
    );
  }

  const optionsReady = isSelectionComplete(product, effective);

  // Price comes from the SELECTED variation, not the parent product —
  // selecting a size instantly re-resolves `matchedVariation` above.
  const displayPrice = matchedVariation ? matchedVariation.price : product.price;
  const displayRegular = matchedVariation ? matchedVariation.regularPrice : product.regularPrice;
  const displayOnSale = matchedVariation ? matchedVariation.onSale : product.onSale;
  const saleBadge =
    displayOnSale && displayRegular && displayRegular > displayPrice
      ? { price: displayPrice, regularPrice: displayRegular }
      : null;
  const displayStockStatus = matchedVariation?.stockStatus ?? product.stockStatus;
  const displayStockQty = matchedVariation ? matchedVariation.stockQuantity : product.stockQuantity;
  const soldOut = displayStockStatus === 'OUT_OF_STOCK';

  const handleAdd = async (goToCart = false) => {
    if (!optionsReady) {
      toast.error(t.choose_option_first);
      return;
    }
    setAdding(true);
    try {
      await add(product, effective, qty);
      if (goToCart) {
        setCartOpen(true);
      } else {
        toast.success(product.name, { description: t.added });
      }
    } catch (err) {
      toast.error(t.error_title, {
        description: err instanceof Error ? err.message : t.error_desc,
      });
    } finally {
      setAdding(false);
    }
  };

  const openCategory = () => {
    setShopCategory(product.categorySlug || null);
    navigate({ name: 'home' });
  };

  return (
    <div>
      {/* ── editorial split: gallery LEFT half + fixed-size card RIGHT half ──
          dir="ltr" physically locks the arrangement (images left, card
          right) in both languages — the requested Prada-style order. The
          card is a constant-size, centered panel (26rem / 28rem) with
          internal scroll. */}
      <div dir="ltr" className="lg:grid lg:grid-cols-2">
        {/* gallery column */}
        <div className="relative min-w-0">
          {/* floating back chip over the first frame */}
          <Button
            variant="ghost"
            className="absolute start-3 top-3 z-30 h-10 rounded-full bg-background/80 text-sm text-foreground backdrop-blur hover:bg-background hover:text-foreground lg:top-6"
            onClick={() => navigate({ name: 'home' })}
          >
            <ArrowLeft className="size-4" />
            {t.back_to_shop}
          </Button>

          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <GalleryStack product={product} saleBadge={saleBadge} />
          </motion.div>
        </div>

        {/* info column — card centered (H+V) inside the sticky half */}
        <div className="min-w-0 max-lg:px-4 lg:sticky lg:top-16 lg:flex lg:h-[calc(100svh-4rem)] lg:items-center lg:justify-center lg:px-6 xl:px-10">
          <motion.div
            variants={staggerContainer(0.07)}
            initial="hidden"
            animate="show"
            dir={isRTL ? 'rtl' : 'ltr'}
            className="flex w-full flex-col gap-5 max-lg:py-8 lg:max-h-full lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:rounded-3xl lg:border lg:bg-muted/60 lg:p-7 lg:shadow-xl lg:shadow-black/5 xl:w-[28rem] xl:p-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [overflow-anchor:none]"
          >
            <div className="flex flex-1 flex-col">
              {/* breadcrumb — quiet, panel-local (Prada-style) */}
              <motion.nav
                variants={fadeUp}
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                <button onClick={() => navigate({ name: 'home' })} className="transition-colors hover:text-foreground">
                  {t.breadcrumb_home}
                </button>
                {product.categoryName && (
                  <>
                    <span aria-hidden>/</span>
                    <button onClick={openCategory} className="transition-colors hover:text-foreground">
                      {product.categoryName}
                    </button>
                  </>
                )}
              </motion.nav>

              {/* eyebrow: category · rating · stock */}
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {product.categoryName}
                </span>
                <Separator orientation="vertical" className="h-3.5" />
                <span className="flex items-center gap-0.5" aria-label={`${product.rating} / 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'size-3.5',
                        i < Math.round(product.rating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  ))}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t.reviews.replace('{count}', String(product.reviewCount))}
                </span>
                <Separator orientation="vertical" className="h-3.5" />
                <StockDot status={displayStockStatus} quantity={displayStockQty} />
              </motion.div>

              {/* price — bound to the selected variation, animated swap */}
              <motion.div variants={fadeUp} className="mt-4 flex items-baseline gap-3" aria-live="polite">
                <motion.span
                  key={`price-${displayPrice}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="text-2xl font-semibold tracking-tight"
                >
                  {formatPrice(displayPrice)}
                </motion.span>
                {saleBadge && (
                  <motion.span
                    key={`regular-${saleBadge.regularPrice}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="text-base text-muted-foreground line-through"
                  >
                    {formatPrice(saleBadge.regularPrice)}
                  </motion.span>
                )}
                {saleBadge && (
                  <Badge variant="secondary" className="text-accent-brand">
                    {t.sale}
                  </Badge>
                )}
              </motion.div>

              {/* oversized title */}
              <motion.h1
                variants={fadeUp}
                className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl xl:text-6xl"
              >
                {product.name}
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-3 max-w-md leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </motion.p>

              {/* fragrance notes (ACF) — only when the product carries data */}
              {product.fragrance && <FragranceNotes fragrance={product.fragrance} />}

              {/* options */}
              {product.attributes.length > 0 && (
                <motion.div variants={fadeUp} className="mt-5 space-y-4">
                  {product.attributes.map((attr) => (
                    <div key={attr.slug}>
                      <p className="mb-2 text-sm font-medium">
                        {attr.name}
                        <span className="ms-2 text-muted-foreground">{effective[attr.slug]}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((opt, i) => {
                          const active = effective[attr.slug] === opt;
                          return (
                            <button
                              key={`${attr.slug}-${i}`}
                              onClick={() => setSelected({ ...effective, [attr.slug]: opt })}
                              className={cn(
                                'h-10 min-w-11 rounded-full border px-4 text-sm font-medium transition-all',
                                active
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'bg-background hover:border-foreground/40'
                              )}
                              aria-pressed={active}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* qty + add to cart */}
              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex h-14 items-center rounded-full border bg-background">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex size-14 items-center justify-center rounded-full transition-colors hover:bg-muted"
                    aria-label={`${t.quantity} -1`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="flex size-14 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
                    disabled={qty >= maxQty}
                    aria-label={`${t.quantity} +1`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <Button
                  size="lg"
                  className="h-14 min-w-44 flex-1 rounded-full text-sm font-semibold sm:flex-none sm:min-w-52"
                  disabled={soldOut || adding}
                  onClick={() => handleAdd(false)}
                >
                  <ShoppingBag className="size-4" />
                  {soldOut ? t.sold_out : adding ? t.adding : t.add_to_cart}
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className={cn(
                    'size-14 rounded-full',
                    wishlisted && 'border-accent-brand text-accent-brand'
                  )}
                  onClick={() => setWishlisted((w) => !w)}
                  aria-label="Wishlist"
                >
                  <Heart className={cn('size-4', wishlisted && 'fill-current')} />
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full rounded-full text-sm font-semibold"
                  disabled={soldOut}
                  onClick={() => handleAdd(true)}
                >
                  {t.checkout}
                </Button>
              </motion.div>
            </div>

            {/* signature black marquee + standalone accordion cards */}
            <motion.div variants={fadeUp} className="space-y-4 pb-3 lg:pb-0">
              <FeatureMarquee items={marqueeItems} />

              <Accordion type="multiple" className="space-y-2.5">
                <AccordionCard value="description" title={t.description_title}>
                  {/* Woo descriptions carry WP block HTML (<p>, <h2>, <strong>…) —
                      render it as formatted content instead of raw tag text. */}
                  <div
                    className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:ps-5"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </AccordionCard>
                <AccordionCard value="details" title={t.details_title}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t.details_body}</p>
                  <dl className="mt-4 space-y-2">
                    {product.attributes.map((a) => (
                      <div key={a.slug} className="flex justify-between gap-4 text-sm">
                        <dt className="text-muted-foreground">{a.name}</dt>
                        <dd className="font-medium">{a.options.join(', ')}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionCard>
                <AccordionCard value="shipping" title={t.shipping_title}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t.shipping_body}</p>
                </AccordionCard>
              </Accordion>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* related */}
      {data.related.length > 0 && (
        <section className="mt-16 px-4 md:mt-24 md:px-8">
          <h2 className="mb-8 text-xl font-bold tracking-tight md:text-2xl">{t.related_title}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
            {data.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
