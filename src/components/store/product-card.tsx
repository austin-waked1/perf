'use client';

// Responsive product card with image zoom, badges, quick add-to-cart.

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/lib/store/ui';
import { useCartStore } from '@/lib/store/cart';
import { useT, usePriceFormatter } from '@/lib/i18n';
import { defaultOptionsFor } from '@/components/store/options';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);
  const add = useCartStore((s) => s.add);
  const [adding, setAdding] = useState(false);
  const soldOut = product.stockStatus === 'OUT_OF_STOCK';

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soldOut || adding) return;
    setAdding(true);
    try {
      await add(product, defaultOptionsFor(product), 1);
      toast.success(product.name, { description: t.added });
    } catch (err) {
      toast.error(t.error_title, {
        description: err instanceof Error ? err.message : t.error_desc,
      });
    } finally {
      setAdding(false);
    }
  };

  const openProduct = () => {
    if (adding) return;
    navigate({ name: 'product', slug: product.slug });
  };

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="group cursor-pointer"
      onClick={openProduct}
      role="button"
      tabIndex={0}
      aria-label={product.name}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProduct();
        }
      }}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] border bg-secondary/60">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            'object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]',
            soldOut && 'opacity-60 grayscale-[40%]'
          )}
        />

        {/* badges */}
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {product.onSale && (
            <Badge className="border-0 bg-accent-brand text-white hover:bg-accent-brand">
              <span dir="ltr">
                {product.regularPrice
                  ? `-${Math.round((1 - product.price / product.regularPrice) * 100)}%`
                  : t.sale}
              </span>
            </Badge>
          )}
          {product.badge === 'Bestseller' && (
            <Badge variant="secondary" className="bg-background/85 backdrop-blur">
              {t.bestseller}
            </Badge>
          )}
          {soldOut && (
            <Badge variant="secondary" className="bg-background/85 backdrop-blur">
              {t.sold_out}
            </Badge>
          )}
        </div>

        {/* quick add — slides up on hover (desktop), always visible (mobile) */}
        {!soldOut && (
          <button
            onClick={handleQuickAdd}
            aria-label={`${t.quick_add}: ${product.name}`}
            className={cn(
              'absolute bottom-3 end-3 z-10 flex size-10 items-center justify-center rounded-full',
              'bg-primary text-primary-foreground shadow-lg transition-all duration-300',
              'opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100',
              'hover:scale-110 active:scale-95'
            )}
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
        )}
      </div>

      <div className="space-y-1 px-1 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {product.categoryName}
        </p>
        <h3 className="line-clamp-1 text-sm font-medium md:text-[15px]">{product.name}</h3>
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold md:text-base">{formatPrice(product.price)}</span>
            {product.onSale && product.regularPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.regularPrice)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-accent-brand text-accent-brand" />
            {product.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
