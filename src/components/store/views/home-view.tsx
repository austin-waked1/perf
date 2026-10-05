'use client';

// Home view — interactive hero showcase, marquee, categories, featured
// products, full shop grid.

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Leaf,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts, useCategories } from '@/hooks/use-commerce';
import { useUIStore } from '@/lib/store/ui';
import { useT, useLangStore } from '@/lib/i18n';
import { ProductCard } from '@/components/store/product-card';
import { HeroShowcase } from '@/components/store/hero-showcase';
import { ProductGridSkeleton } from '@/components/store/skeletons';
import { fadeUp, staggerContainer, scrollToId } from '@/components/store/motion';
import type { Category, ProductSort } from '@/lib/types';
import { cn } from '@/lib/utils';

function categoryName(cat: Pick<Category, 'name' | 'nameAr'>, lang: 'en' | 'ar'): string {
  return lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name;
}

function openShopFromHome(setShopCategory: (slug: string | null) => void, slug: string | null, target: 'shop' | 'categories') {
  setShopCategory(slug);
  if (useUIStore.getState().view.name !== 'home') {
    navigateHome(target);
  }
  scrollToId(target);
}

function navigateHome(target: 'shop' | 'categories') {
  useUIStore.getState().navigate({ name: 'home' });
  void target;
}

/* -------------------------------- Marquee --------------------------------- */

function Marquee() {
  const { t, lang } = useT();
  const items =
    lang === 'ar'
      ? ['مواد طبيعية', 'شحن مجاني فوق ٧٥$', 'إرجاع خلال ٣٠ يوماً', 'إنتاج بدفعات صغيرة', 'دفع آمن']
      : ['Natural materials', 'Free shipping over $75', '30-day returns', 'Small-batch production', 'Secure checkout'];
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden border-y bg-secondary/50 py-3.5" aria-hidden>
      <div className="marquee-track flex w-max items-center">
        {row.map((item, i) => (
          <span
            key={i}
            className="me-10 flex items-center gap-10 whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            {item}
            <span className="size-1 rounded-full bg-accent-brand/70" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Categories ------------------------------- */

function CategoryGrid() {
  const { t, lang } = useT();
  const { data: categories, isPending } = useCategories();

  return (
    <section id="categories" className="scroll-mt-24 px-4 py-14 md:px-8 md:py-20">
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mb-8 md:mb-10"
      >
        <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight md:text-4xl">
          {t.categories_title}
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground md:text-base">
          {t.categories_subtitle}
        </motion.p>
      </motion.div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {(categories ?? []).map((cat) => (
            <motion.button
              key={cat.id}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              onClick={() => openShopFromHome(useUIStore.getState().setShopCategory, cat.slug, 'shop')}
              className="group relative aspect-[3/4] overflow-hidden rounded-3xl border text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${categoryName(cat, lang)} (${cat.count})`}
            >
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={categoryName(cat, lang)}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-muted),var(--color-secondary))] transition-transform duration-700 ease-out group-hover:scale-[1.07]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
                <p className="text-base font-semibold md:text-lg">{categoryName(cat, lang)}</p>
                <p className="mt-0.5 text-xs text-white/75">{t.products_count.replace("{count}", String(cat.count))}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </section>
  );
}

/* ------------------------------- Shop grid -------------------------------- */

function ShopSection({ heading = true, limit }: { heading?: boolean; limit?: number }) {
  const { t, lang } = useT();
  const shopCategory = useUIStore((s) => s.shopCategory);
  const setShopCategory = useUIStore((s) => s.setShopCategory);
  const [sort, setSort] = useState<ProductSort>('featured');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: categories } = useCategories();
  const { data: products, isPending, isError, refetch } = useProducts({
    category: shopCategory,
    sort,
    search: debounced || null,
    limit,
  });

  return (
    <section id="shop" className="scroll-mt-24 px-4 py-14 md:px-8 md:py-20">
      {heading && (
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-8"
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight md:text-4xl">
            {t.shop_title}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground md:text-base">
            {t.shop_subtitle}
          </motion.p>
        </motion.div>
      )}

      {/* toolbar */}
      <div className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="tablist" aria-label={t.categories_title}>
          <FilterChip active={shopCategory === null} onClick={() => setShopCategory(null)}>
            {t.all_filter}
          </FilterChip>
          {(categories ?? []).map((c) => (
            <FilterChip
              key={c.id}
              active={shopCategory === c.slug}
              onClick={() => setShopCategory(shopCategory === c.slug ? null : c.slug)}
            >
              {categoryName(c, lang)}
            </FilterChip>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-56 lg:flex-none">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search_placeholder}
              className="h-10 rounded-full ps-9"
              aria-label={t.search_placeholder}
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as ProductSort)}>
            <SelectTrigger className="h-10 w-40 shrink-0 rounded-full" aria-label={t.sort_label}>
              <SelectValue placeholder={t.sort_label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">{t.sort_featured}</SelectItem>
              <SelectItem value="price-asc">{t.sort_price_asc}</SelectItem>
              <SelectItem value="price-desc">{t.sort_price_desc}</SelectItem>
              <SelectItem value="rating">{t.sort_rating}</SelectItem>
              <SelectItem value="newest">{t.sort_newest}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <ProductGridSkeleton count={8} />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed py-16 text-center">
          <p className="font-medium">{t.error_title}</p>
          <p className="text-sm text-muted-foreground">{t.error_desc}</p>
          <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
            {t.retry}
          </Button>
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed py-16 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.no_results}</p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setSearch('');
              setShopCategory(null);
            }}
          >
            {t.clear_filters}
          </Button>
        </div>
      )}

      {products && products.length > 0 && !limit && (
        <p className="mt-12 text-center text-xs uppercase tracking-widest text-muted-foreground">
          — {t.load_more} —
        </p>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        'h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-all',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Value props ------------------------------ */

function ValueProps() {
  const { t } = useT();
  const props = [
    { Icon: Truck, title: t.prop_shipping_title, desc: t.prop_shipping_desc },
    { Icon: RotateCcw, title: t.prop_returns_title, desc: t.prop_returns_desc },
    { Icon: ShieldCheck, title: t.prop_secure_title, desc: t.prop_secure_desc },
    { Icon: Leaf, title: t.prop_craft_title, desc: t.prop_craft_desc },
  ];
  return (
    <section className="border-y bg-secondary/40">
      <motion.div
        variants={staggerContainer(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-8"
      >
        {props.map(({ Icon, title, desc }) => (
          <motion.div key={title} variants={fadeUp} className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border bg-background">
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ------------------------------- Featured --------------------------------- */

function FeaturedSection() {
  const { t } = useT();
  const { data, isPending } = useProducts({ featured: true, limit: 4 });

  return (
    <section className="px-4 py-14 md:px-8 md:py-20">
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mb-8 flex items-end justify-between gap-4 md:mb-10"
      >
        <div>
          <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight md:text-4xl">
            {t.featured_title}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            {t.featured_subtitle}
          </motion.p>
        </div>
        <motion.div variants={fadeUp} className="hidden md:block">
          <Button variant="ghost" className="rounded-full" onClick={() => openShopFromHome(useUIStore.getState().setShopCategory, null, 'shop')}>
            {t.view_all}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Button>
        </motion.div>
      </motion.div>

      {isPending ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6"
        >
          {(data ?? []).map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </motion.div>
      )}

      <div className="mt-8 text-center md:hidden">
        <Button variant="outline" className="rounded-full" onClick={() => openShopFromHome(useUIStore.getState().setShopCategory, null, 'shop')}>
          {t.view_all}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </section>
  );
}

/* --------------------------------- Export --------------------------------- */

export function HomeView() {
  return (
    <>
      <HeroShowcase />
      <Marquee />
      <CategoryGrid />
      <FeaturedSection />
      <ShopSection />
      <ValueProps />
    </>
  );
}
