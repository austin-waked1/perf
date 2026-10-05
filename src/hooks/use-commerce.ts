'use client';

// TanStack Query hooks for the commerce layer — give the UI consistent
// loading / error / retry behaviour (skeleton loaders read from `isPending`).

import { useQuery } from '@tanstack/react-query';
import { getCategories, getProduct, getProducts } from '@/lib/commerce';
import type { Category, Product, ProductQuery } from '@/lib/types';

export function useProducts(query: ProductQuery = {}) {
  const { category, featured, search, sort, limit } = query;
  return useQuery<Product[], Error>({
    queryKey: ['products', category ?? null, featured ?? false, search ?? null, sort ?? 'featured', limit ?? null],
    queryFn: () => getProducts({ category, featured, search, sort, limit }),
    staleTime: 60_000,
  });
}

export function useProduct(slug: string | null) {
  return useQuery<{ product: Product; related: Product[] }, Error>({
    queryKey: ['product', slug],
    queryFn: () => getProduct(slug as string),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}
