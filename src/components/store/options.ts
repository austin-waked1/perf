// Helpers for product attribute (option) selection.

import type { Product } from '@/lib/types';

/** Default selection = first option of every attribute. */
export function defaultOptionsFor(product: Product): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const attr of product.attributes) {
    if (attr.options.length > 0) {
      opts[attr.slug] = attr.options[0];
    }
  }
  return opts;
}

/** True when every attribute has a selected value. */
export function isSelectionComplete(
  product: Product,
  selected: Record<string, string>
): boolean {
  return product.attributes.every((a) => !!selected[a.slug]);
}
