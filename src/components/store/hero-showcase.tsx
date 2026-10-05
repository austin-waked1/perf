'use client';

// Hero — the OLD showcase restored, wrapped around a game-grade coverflow.
//
// OLD SOUL (restored verbatim from the pre-dark-stage design):
//   • left copy column — badge / headline / subtitle / rating / CTAs / stats;
//   • the ORIGINAL background lighting: the active product photo itself is the
//     ambient layer — blurred wide, oversaturated, slowly drifting — so the
//     whole stage recolors itself with each product's own palette (the old
//     effect), plus warm stage tints + legibility scrims;
//   • FORMA watermark, glass control card, bottom status bar. The glass card
//     is now proportioned (centered, capped width).
//
// NEW GAME (the coverflow):
//   • one continuous MotionValue `pos` (a float index) drives EVERY card
//     transform through useTransform — the fan tracks the finger 1:1 and
//     springs with real momentum on release (flick it, it glides);
//   • the centre card lifts above the fan — lighting stays OLD ONLY (the
//     image-keyed ambience); no extra glows behind the cards;
//   • every card carries its own name + price strip; prev/next vertical rails
//     on the screen edges show the neighbouring product's name + price and
//     parallax while you swipe;
//   • inputs: drag anywhere, trackpad/wheel flick, click a side card to focus
//     it, click the centre card to open the product, keyboard arrows, dots,
//     thumbnails, gentle autoplay (pauses on hover/drag/hidden tab).

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Sparkles,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/use-commerce';
import { useUIStore } from '@/lib/store/ui';
import { useCartStore } from '@/lib/store/cart';
import { useT, usePriceFormatter } from '@/lib/i18n';
import { defaultOptionsFor } from '@/components/store/options';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ── Per-product artwork overrides (slug → custom PNG / background) ─────── */
const HERO_ASSETS: Record<string, { image?: string; background?: string }> = {
  // yoo: { image: '/images/hero/yoo.png' },
};

/* ── Warm stage tints layered over the blurred product photo ────────────── */
const STAGE_BACKGROUNDS = [
  'radial-gradient(120% 100% at 75% 12%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%), radial-gradient(90% 80% at 20% 90%, rgba(207,128,71,0.28) 0%, rgba(207,128,71,0) 60%), #141413',
  'radial-gradient(120% 100% at 25% 10%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%), radial-gradient(90% 80% at 85% 90%, rgba(120,124,118,0.35) 0%, rgba(120,124,118,0) 60%), #171716',
  'radial-gradient(120% 100% at 70% 85%, rgba(207,128,71,0.22) 0%, rgba(207,128,71,0) 55%), radial-gradient(80% 70% at 15% 15%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 55%), #101010',
  'radial-gradient(110% 90% at 50% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%), radial-gradient(80% 80% at 80% 95%, rgba(151,80,31,0.30) 0%, rgba(151,80,31,0) 60%), #181715',
];

const MAX_SLIDES = 5;
const AUTOPLAY_MS = 5500;
const LINE_EASE = [0.215, 0.61, 0.355, 1] as const;

interface HeroSlide {
  product: Product;
  image: string;
  background: string;
  /** true when the image is a custom transparent PNG from HERO_ASSETS */
  custom: boolean;
}

/* ── Lumora-style headline line reveal (clip + slide-up) ─────────────────── */
function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
      <motion.span
        className="block"
        initial={{ y: '112%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, ease: LINE_EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ── Reveal-on-mount wrapper (opacity + rise, Lumora springs) ────────────── */
function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', tension: 200, friction: 24, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stage dimensions per breakpoint (4:5 centre card + fan spacing) ────── */
function useStageDims() {
  const [dims, setDims] = useState({ w: 232, h: 290, step: 164, lift: 14 });
  useEffect(() => {
    const mqSm = window.matchMedia('(min-width: 640px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqXl = window.matchMedia('(min-width: 1280px)');
    const mq2xl = window.matchMedia('(min-width: 1536px)');
    const update = () => {
      if (mq2xl.matches) setDims({ w: 440, h: 550, step: 306, lift: 26 });
      else if (mqXl.matches) setDims({ w: 400, h: 500, step: 280, lift: 24 });
      else if (mqLg.matches) setDims({ w: 340, h: 425, step: 238, lift: 22 });
      else if (mqSm.matches) setDims({ w: 300, h: 375, step: 210, lift: 18 });
      else setDims({ w: 232, h: 290, step: 164, lift: 14 });
    };
    update();
    const mqs = [mqSm, mqLg, mqXl, mq2xl];
    mqs.forEach((mq) => mq.addEventListener('change', update));
    return () => mqs.forEach((mq) => mq.removeEventListener('change', update));
  }, []);
  return dims;
}

/* ── Flank rail — vertical prev/next name + price on the screen edge ────── */
function FlankRail({
  side,
  slide,
  dragPx,
  onClick,
  label,
  formatPrice,
}: {
  side: 'prev' | 'next';
  slide: HeroSlide;
  dragPx: MotionValue<number>;
  onClick: () => void;
  label: string;
  formatPrice: (price: number) => string;
}) {
  const drift = useTransform(dragPx, [-320, 320], side === 'prev' ? [12, -12] : [-12, 12]);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      style={{ x: drift, y: '-50%' }}
      aria-label={label}
      tabIndex={-1}
      className={cn(
        'group/rail absolute top-1/2 z-[35] hidden flex-col items-center gap-3.5 lg:flex',
        side === 'prev' ? 'left-2' : 'right-2'
      )}
    >
      <span className="grid size-10 place-items-center rounded-full border border-foreground/15 bg-white/55 text-foreground/60 shadow-sm backdrop-blur transition-all duration-300 group-hover/rail:scale-110 group-hover/rail:text-foreground dark:border-white/15 dark:bg-black/30 dark:text-white/60 dark:group-hover/rail:text-white">
        {side === 'prev' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={slide.product.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="max-w-[3.5rem] truncate rounded-full bg-white/55 px-1.5 py-3 text-[0.6rem] font-medium uppercase tracking-[0.28em] text-foreground/60 shadow-sm backdrop-blur transition-colors group-hover/rail:text-foreground [writing-mode:vertical-rl] dark:bg-black/30 dark:text-white/55 dark:group-hover/rail:text-white">
            {slide.product.name}
          </span>
          <span
            dir="ltr"
            className="rounded-full bg-white/55 px-2 py-0.5 text-[0.62rem] font-semibold tabular-nums text-foreground/70 shadow-sm backdrop-blur dark:bg-black/30 dark:text-white/50"
          >
            {formatPrice(slide.product.price)}
          </span>
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ── FanCard — one card of the coverflow, driven by the shared `pos` ─────── */
function FanCard({
  slide,
  i,
  n,
  pos,
  dims,
  isCenter,
  onActivate,
  onOpen,
  onQuickAdd,
  adding,
  viewLabel,
  addLabel,
  saleLabel,
  formatPrice,
}: {
  slide: HeroSlide;
  i: number;
  n: number;
  pos: MotionValue<number>;
  dims: { w: number; h: number; step: number; lift: number };
  isCenter: boolean;
  onActivate: () => void;
  onOpen: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  adding: boolean;
  viewLabel: string;
  addLabel: string;
  saleLabel: string;
  formatPrice: (price: number) => string;
}) {
  /* circular offset from the current position — continuous, wraps ±n/2 */
  const offset = useTransform(pos, (p) => {
    if (n < 2) return 0;
    let d = (((p - i) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  });
  const x = useTransform(offset, (o) => o * dims.step);
  const z = useTransform(offset, (o) => -Math.min(Math.abs(o), 2.6) * 150);
  const rotateY = useTransform(offset, (o) => -Math.max(-2.6, Math.min(2.6, o)) * 40);
  const scale = useTransform(offset, (o) => 1 - Math.min(Math.abs(o), 2.6) * 0.12);
  const y = useTransform(offset, (o) => -dims.lift * Math.max(0, 1 - Math.abs(o)));
  const opacity = useTransform(offset, (o) => {
    const a = Math.abs(o);
    if (a > 2.3) return 0;
    if (a < 0.5) return 1;
    return Math.max(0.14, 1 - (a - 0.5) * 0.44);
  });
  const brightness = useTransform(offset, (o) => {
    const a = Math.abs(o);
    return a < 0.5 ? 1 : Math.max(0.52, 1 - (a - 0.5) * 0.3);
  });
  const filter = useMotionTemplate`brightness(${brightness})`;
  const zIndex = useTransform(offset, (o) => 30 - Math.round(Math.abs(o) * 2));

  return (
    <motion.div
      style={{
        x,
        y,
        z,
        rotateY,
        scale,
        opacity,
        filter,
        zIndex,
        width: dims.w,
        height: dims.h,
        marginLeft: -dims.w / 2,
        marginTop: -dims.h / 2,
      }}
      className="absolute left-1/2 top-1/2 cursor-pointer overflow-hidden rounded-[2rem] shadow-2xl shadow-black/25 ring-1 ring-black/10 dark:shadow-black/60 dark:ring-white/10"
      onClick={onActivate}
      role="button"
      tabIndex={-1}
      title={isCenter ? viewLabel : slide.product.name}
      aria-label={slide.product.name}
    >
      <Image
        src={slide.image}
        alt={slide.product.name}
        fill
        draggable={false}
        priority={i === 0}
        loading={i === 0 ? undefined : 'eager'}
        sizes="(max-width: 640px) 65vw, 460px"
        className={cn('object-cover', slide.custom && 'object-contain p-8 sm:p-10')}
      />

      {/* soft floor shade so the strip stays readable */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/30 via-black/[0.07] to-transparent"
      />

      {slide.product.onSale && (
        <span className="absolute start-4 top-4 rounded-full bg-accent-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          {saleLabel}
        </span>
      )}

      {/* per-card info strip — name + price ride the flanks too */}
      <div
        className={cn(
          'absolute inset-x-3 bottom-3 flex flex-col gap-0.5 rounded-2xl bg-black/45 px-3.5 py-2.5 ring-1 ring-white/15 backdrop-blur-md',
          !isCenter && 'opacity-85'
        )}
      >
        <p className="text-[0.58rem] font-medium uppercase tracking-[0.18em] text-white/55">
          {slide.product.categoryName}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-white">{slide.product.name}</p>
          <p className="flex shrink-0 items-baseline gap-1.5" dir="ltr">
            <span className="text-sm font-semibold tabular-nums text-white">
              {formatPrice(slide.product.price)}
            </span>
            {slide.product.onSale && slide.product.regularPrice && (
              <span className="text-[0.68rem] tabular-nums text-white/50 line-through">
                {formatPrice(slide.product.regularPrice)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* centre-card actions (always visible on touch, hover-reveal on desktop) */}
      {isCenter && (
        <div className="absolute bottom-[4.6rem] end-3 z-[3] flex translate-y-2 items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-lg:translate-y-0 max-lg:opacity-100 lg:focus-within:translate-y-0 lg:focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-lg ring-1 ring-black/10 transition-transform hover:scale-[1.04] active:scale-95"
          >
            {viewLabel}
          </button>
          <button
            onClick={onQuickAdd}
            disabled={adding}
            aria-label={addLabel}
            className="grid size-9 place-items-center rounded-full bg-gradient-to-b from-accent-brand-from to-accent-brand-to text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function HeroShowcase() {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);
  const setShopCategory = useUIStore((s) => s.setShopCategory);
  const add = useCartStore((s) => s.add);
  const reduceMotion = useReducedMotion();

  const { data: products, isPending } = useProducts({ limit: 8 });

  const slides = useMemo<HeroSlide[]>(() => {
    const list = (products ?? []).slice(0, MAX_SLIDES);
    return list.map((product, i) => ({
      product,
      image: HERO_ASSETS[product.slug]?.image ?? product.image,
      background:
        HERO_ASSETS[product.slug]?.background ?? STAGE_BACKGROUNDS[i % STAGE_BACKGROUNDS.length],
      custom: Boolean(HERO_ASSETS[product.slug]?.image),
    }));
  }, [products]);

  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(0); // index at rest — drives ambience & meta
  const [adding, setAdding] = useState(false);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // bumps on interaction → restarts autoplay
  const dims = useStageDims();

  const active = slides[settled];
  const activeProduct = active?.product;

  /* ── the physics core: one continuous position drives the whole fan ──── */
  const pos = useMotionValue(0);
  const dragPx = useMotionValue(0);
  const dragging = useRef(false);
  const captured = useRef(false);
  const movedRef = useRef(false);
  const startPos = useRef(0);
  const startPx = useRef(0);
  const samples = useRef<{ t: number; x: number }[]>([]);

  const wrap = useCallback(
    (d: number) => {
      if (n < 2) return 0;
      const m = ((d % n) + n) % n;
      return m > n / 2 ? m - n : m;
    },
    [n]
  );

  /* live index drives the cards + counter; a debounced "settled" index drives
     the ambience (background photo, glow) and the glass-bar meta so fast
     sweeps neither strobe nor wedge the AnimatePresence swaps */
  useEffect(() => {
    if (n === 0) return;
    let tid = 0;
    const norm = (v: number) => ((Math.round(v) % n) + n) % n;
    const unsub = pos.on('change', (v) => {
      setIndex((prev) => (prev === norm(v) ? prev : norm(v)));
      window.clearTimeout(tid);
      tid = window.setTimeout(() => {
        if (!dragging.current) setSettled(norm(pos.get()));
      }, 220);
    });
    return () => {
      unsub();
      window.clearTimeout(tid);
    };
  }, [pos, n]);

  const glideTo = useCallback(
    (target: number, velocity = 0) => {
      pos.stop();
      if (reduceMotion) {
        pos.set(target);
        return;
      }
      animate(pos, target, { type: 'spring', velocity, stiffness: 220, damping: 26, mass: 0.9 });
    },
    [pos, reduceMotion]
  );

  const go = useCallback(
    (step: 1 | -1) => {
      if (n < 2) return;
      setCycle((c) => c + 1);
      glideTo(Math.round(pos.get()) + step);
    },
    [n, glideTo, pos]
  );

  const goTo = useCallback(
    (i: number) => {
      if (n < 2 || !slides[i]) return;
      const cur = pos.get();
      const target = cur + wrap(i - cur); // shortest way around the circle
      if (Math.abs(target - cur) < 0.01) return;
      setCycle((c) => c + 1);
      glideTo(target);
    },
    [n, slides, wrap, glideTo, pos]
  );

  /* ── drag: 1:1 tracking with capture-on-intent + momentum on release ─── */
  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2) return;
    dragging.current = true;
    captured.current = false;
    movedRef.current = false;
    pos.stop();
    dragPx.stop();
    dragPx.set(0);
    startPos.current = pos.get();
    startPx.current = e.clientX;
    samples.current = [{ t: performance.now(), x: e.clientX }];
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPx.current;
    if (!captured.current && Math.abs(dx) > 6) {
      captured.current = true;
      movedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may already be gone */
      }
    }
    if (captured.current) {
      if (!reduceMotion) dragPx.set(dx);
      pos.set(startPos.current - dx / dims.step);
    }
    const s = samples.current;
    s.push({ t: performance.now(), x: e.clientX });
    if (s.length > 6) s.shift();
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (captured.current) {
      captured.current = false;
      setCycle((c) => c + 1);
      /* velocity from the last samples → momentum projection */
      const s = samples.current;
      const last = s[s.length - 1];
      const first = s.find((p) => last.t - p.t <= 120) ?? s[0];
      let velocity = 0;
      if (last && first && last.t > first.t) {
        const vx = (last.x - first.x) / (last.t - first.t); // px per ms
        velocity = (-vx / dims.step) * 1000; // index units per second
      }
      const startIdx = Math.round(startPos.current);
      const projected = pos.get() + velocity * 0.24;
      const target = Math.max(startIdx - 2, Math.min(startIdx + 2, Math.round(projected)));
      glideTo(target, velocity);
    }
    animate(dragPx, 0, { type: 'spring', stiffness: 320, damping: 30 });
    setPaused(false);
  };

  /* wheel / trackpad flick — horizontal intent only, vertical keeps scrolling */
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (n < 2) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (d === 0) return;
    const now = performance.now();
    if (now - wheelLock.current < 380) return;
    wheelLock.current = now;
    go(d > 0 ? 1 : -1);
  };

  const onStageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  };

  /* clamp when the catalog changes under us */
  useEffect(() => {
    if (n > 0 && index >= n) {
      pos.set(0);
      setIndex(0);
      setSettled(0);
    }
  }, [n, index, pos]);

  /* gentle autoplay — pauses on hover / drag / focus / hidden tab / reduced motion */
  useEffect(() => {
    if (paused || reduceMotion || n < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden || dragging.current) return;
      glideTo(Math.round(pos.get()) + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, n, cycle, glideTo, pos]);

  const openProduct = () => {
    if (!activeProduct) return;
    navigate({ name: 'product', slug: activeProduct.slug });
  };

  const openShop = () => {
    setShopCategory(null);
    if (useUIStore.getState().view.name !== 'home') navigate({ name: 'home' });
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openCategories = () => {
    setShopCategory(null);
    if (useUIStore.getState().view.name !== 'home') navigate({ name: 'home' });
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProduct || adding || movedRef.current) return;
    setAdding(true);
    try {
      await add(activeProduct, defaultOptionsFor(activeProduct), 1);
      toast.success(activeProduct.name, { description: t.added });
    } catch (err) {
      toast.error(t.error_title, {
        description: err instanceof Error ? err.message : t.error_desc,
      });
    } finally {
      setAdding(false);
    }
  };

  const activateCard = (i: number) => {
    if (movedRef.current) return;
    if (i === index) openProduct();
    else goTo(i);
  };

  /* reactive values derived from the live drag */
  const fanTilt = useTransform(dragPx, [-260, 260], reduceMotion ? [0, 0] : [-5, 5]);
  const bgDrift = useTransform(dragPx, [-320, 320], reduceMotion ? [0, 0] : [-22, 22]);

  return (
    <section
      id="home"
      className="hero-surface relative isolate flex min-h-[92svh] flex-col overflow-hidden rounded-b-[2rem]"
    >
      {/* ── Background: the product photo itself, treated (the OLD lighting) ── */}
      <motion.div className="absolute -inset-6 z-0" style={{ x: bgDrift }} aria-hidden>
        {/* always-on base tint (also the loading fallback) */}
        <div className="absolute inset-0" style={{ background: STAGE_BACKGROUNDS[0] }} />

        {active && (
          <AnimatePresence initial={false}>
            <motion.div
              key={`bg-${settled}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              {/* ambient blurred cover of the product photo + slow drift */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.28 }}
                animate={{ scale: 1.14 }}
                transition={{ duration: 9, ease: 'easeOut' }}
              >
                <Image
                  src={active.image}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover opacity-55 blur-2xl saturate-[1.35] dark:opacity-40"
                />
              </motion.div>

              {/* warm stage tint on top of the glow */}
              <div
                className="absolute inset-0 opacity-60 dark:opacity-55"
                style={{ background: active.background }}
              />

              {/* legibility scrims */}
              <div className="absolute inset-0 bg-gradient-to-t via-background/45 from-background to-background/10" />
              <div className="absolute inset-0 hidden bg-gradient-to-r from-background/85 via-background/30 to-transparent lg:block" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-transparent to-background/85 lg:hidden" />
            </motion.div>
          </AnimatePresence>
        )}

      </motion.div>

      {/* giant watermark */}
      <motion.p
        aria-hidden
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', tension: 120, friction: 30, delay: 0.3 }}
        className="pointer-events-none absolute inset-x-0 bottom-40 z-[1] select-none text-center text-[24vw] font-bold leading-none text-white/45 md:bottom-44 md:text-[12rem] dark:text-white/[0.045]"
      >
        FORMA
      </motion.p>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 grid w-full flex-1 content-center gap-10 px-5 pb-12 pt-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-16 lg:pt-14">
        {/* Left: copy */}
        <div className="relative z-20 order-2 lg:order-1 lg:col-span-6">
          <Reveal delay={0.05}>
            <span className="inline-flex items-center gap-2 rounded-[0.875rem] border border-foreground/10 bg-white/50 px-3.5 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
              <Sparkles className="size-3.5 text-accent-brand" />
              {t.hero_badge}
            </span>
          </Reveal>

          <h1 className="mt-5 max-w-[18ch] text-4xl font-semibold leading-[0.98] tracking-[-0.02em] sm:text-5xl md:text-6xl">
            <RevealLine delay={0.15}>{t.hero_title_1}</RevealLine>
            <RevealLine delay={0.27}>
              <span className="text-muted-foreground">{t.hero_title_2}</span>
            </RevealLine>
          </h1>

          <Reveal delay={0.45}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/60 md:text-lg">
              {t.hero_subtitle}
            </p>
          </Reveal>

          <Reveal delay={0.55} className="mt-5 flex items-center gap-3">
            <span className="flex items-center gap-0.5 text-accent-brand" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            <span className="text-sm font-medium text-foreground/70">{t.hero_rating}</span>
          </Reveal>

          {/* Lumora pill CTAs — dark pill with arrow badge + outline pill */}
          <Reveal delay={0.65} className="mt-8 flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', tension: 320, friction: 18 }}
              onClick={openShop}
              className="group inline-flex items-center gap-3 rounded-full bg-ink py-1.5 ps-7 pe-1.5 text-sm font-medium text-white shadow-lg shadow-black/10 dark:bg-primary dark:text-primary-foreground"
            >
              {t.hero_cta_primary}
              <span className="grid size-9 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 dark:bg-ink dark:text-primary">
                <ArrowRight className="size-4 rtl:rotate-180" />
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', tension: 320, friction: 18 }}
              onClick={openCategories}
              className="inline-flex items-center rounded-full border border-foreground/15 bg-transparent px-7 py-3 text-sm font-medium transition-colors hover:border-foreground/35 dark:border-white/20 dark:hover:border-white/50"
            >
              {t.hero_cta_secondary}
            </motion.button>
          </Reveal>

          <Reveal delay={0.75} className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {[t.hero_stat_1, t.hero_stat_2, t.hero_stat_3].map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-sm text-foreground/60">
                <span className="size-1 rounded-full bg-accent-brand" aria-hidden />
                {s}
              </span>
            ))}
          </Reveal>
        </div>

        {/* Right: the coverflow stage — the product card is the centre of the fan */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          <Reveal delay={0.2} y={20}>
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label={t.hero_slide_status
                .replace('{i}', String(index + 1))
                .replace('{n}', String(n || 1))}
              onKeyDown={onStageKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
              onWheel={onWheel}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              tabIndex={n > 1 ? 0 : -1}
              dir="ltr"
              className="group relative mx-auto w-full max-w-[36rem] touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-none"
              style={{ perspective: '1500px', height: dims.h + 96 }}
            >
              {/* floor shadow grounding the centre card */}
              <div
                aria-hidden
                className="absolute bottom-7 left-1/2 h-10 rounded-[100%] bg-black/35 blur-2xl dark:bg-black/50"
                style={{ width: dims.w * 0.92, transform: 'translateX(-50%)' }}
              />

              {/* the fan */}
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d', rotateY: fanTilt }}
              >
                {isPending || n === 0
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={`ghost-${i}`}
                        aria-hidden
                        className="absolute left-1/2 top-1/2 animate-pulse rounded-[2rem] bg-white/[0.06] ring-1 ring-black/5 dark:ring-white/10"
                        style={{
                          width: dims.w,
                          height: dims.h,
                          marginLeft: -dims.w / 2,
                          marginTop: -dims.h / 2,
                          transform: `translateX(${(i - 1) * dims.step}px)`,
                        }}
                      />
                    ))
                  : slides.map((slide, i) => (
                      <FanCard
                        key={slide.product.id}
                        slide={slide}
                        i={i}
                        n={n}
                        pos={pos}
                        dims={dims}
                        isCenter={i === index}
                        onActivate={() => activateCard(i)}
                        onOpen={openProduct}
                        onQuickAdd={quickAdd}
                        adding={adding}
                        viewLabel={t.hero_view_product}
                        addLabel={`${t.add_to_cart}: ${slide.product.name}`}
                        saleLabel={t.sale}
                        formatPrice={formatPrice}
                      />
                    ))}
              </motion.div>

              {/* flank rails — the neighbour product's name + price, per edge */}
              {n > 1 && !isPending && (
                <>
                  <FlankRail
                    side="prev"
                    slide={slides[(settled - 1 + n) % n]}
                    dragPx={dragPx}
                    onClick={() => goTo((settled - 1 + n) % n)}
                    label={t.hero_prev}
                    formatPrice={formatPrice}
                  />
                  <FlankRail
                    side="next"
                    slide={slides[(settled + 1) % n]}
                    dragPx={dragPx}
                    onClick={() => goTo((settled + 1) % n)}
                    label={t.hero_next}
                    formatPrice={formatPrice}
                  />
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── Floating control card (glass) — proportioned: centered, capped ── */}
      <Reveal delay={0.35} y={16} className="relative z-10 w-full px-5 pb-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-[1.5rem] border border-foreground/10 bg-white/65 p-2.5 shadow-xl shadow-black/[0.08] backdrop-blur-xl lg:mb-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/40">
          {/* thumbnails — click to switch product */}
          {isPending ? (
            <div className="flex gap-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="size-14 animate-pulse rounded-[0.875rem] bg-muted sm:size-16" />
              ))}
            </div>
          ) : (
            <div
              className="no-scrollbar flex gap-2 overflow-x-auto"
              role="tablist"
              aria-label={t.featured_title}
            >
              {slides.map((s, i) => (
                <button
                  key={s.product.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.product.name}
                  onClick={() => goTo(i)}
                  className={cn(
                    'relative size-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-muted transition-all duration-300 sm:size-16',
                    i === index
                      ? 'scale-[1.06] ring-2 ring-foreground dark:ring-white'
                      : 'opacity-60 ring-1 ring-foreground/10 hover:opacity-100'
                  )}
                >
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    // same src as the (eager) hero card photo — eager here is a
                    // cache hit and prevents a false-positive LCP dev warning
                    loading="eager"
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mx-auto hidden min-w-0 flex-col items-center sm:flex" aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`meta-${settled}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="min-w-0 text-center"
              >
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                  {activeProduct?.categoryName}
                </p>
                <p className="max-w-[12rem] truncate text-sm font-medium">{activeProduct?.name}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* progress dashes + prev / next */}
          <div className="ms-auto flex items-center gap-2.5">
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    i === index
                      ? 'w-4 bg-foreground dark:bg-white'
                      : 'w-1 bg-foreground/20 dark:bg-white/25'
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => go(-1)}
              disabled={n < 2}
              aria-label={t.hero_prev}
              className="grid size-10 place-items-center rounded-full bg-white text-foreground/70 ring-1 ring-foreground/10 transition-colors hover:text-foreground disabled:opacity-40 dark:bg-white/10 dark:text-white/70 dark:ring-white/15 dark:hover:text-white"
            >
              <ArrowRight className="size-4 rotate-180 rtl:rotate-0" />
            </button>
            <button
              onClick={() => go(1)}
              disabled={n < 2}
              aria-label={t.hero_next}
              className="grid size-10 place-items-center rounded-full bg-white text-foreground/70 ring-1 ring-foreground/10 transition-colors hover:text-foreground disabled:opacity-40 dark:bg-white/10 dark:text-white/70 dark:ring-white/15 dark:hover:text-white"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </Reveal>

      {/* bottom status bar */}
      <Reveal delay={0.9} y={0} className="relative z-10">
        <div className="flex items-center justify-between gap-3 border-t border-foreground/10 px-5 py-4 text-[0.7rem] font-medium uppercase tracking-[0.025em] text-foreground/55 sm:px-8 dark:border-white/10 dark:text-white/50">
          <span>{t.hero_stat_1}</span>
          <span className="hidden sm:inline">{t.hero_stat_3}</span>
          <span className="inline-flex items-center gap-2">
            {t.hero_scroll}
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              ↓
            </motion.span>
          </span>
        </div>
      </Reveal>
    </section>
  );
}
