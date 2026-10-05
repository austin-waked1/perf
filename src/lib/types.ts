// FORMA Store — shared domain types.
// These types are the contract between the UI and whatever commerce backend is
// behind /api (local Prisma adapter today, WooGraphQL adapter tomorrow).

export interface ProductAttribute {
  name: string;
  slug: string;
  options: string[];
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/**
 * ACF "fragranceDetails" group (WordPress) — mapped onto the product.
 *
 * EXTENSIBILITY CONTRACT: when a new field is added to the ACF group and
 * exposed in GraphQL, wire it in three places:
 *   1. `src/lib/graphql/queries.ts` → `fragranceDetails { ... }` document
 *   2. `normalizeFragranceDetails()` in `src/lib/graphql/normalize.ts`
 *   3. here, as an optional member
 * The ProductView fragrance panel renders rows conditionally, so new fields
 * light up as soon as they carry data.
 */
export interface FragranceDetails {
  /** e.g. ["Bergamot", "Pink Pepper"] */
  topNotes: string[];
  /** WP field is spelled "hartNotes" */
  heartNotes: string[];
  /** ACF field not yet exposed in the live GraphQL schema — lights up when added */
  baseNotes: string[];
  /** 0–100 scent-trail intensity, or null when unset */
  sillageValue: number | null;
}

/** A purchasable variation of a variable product (WooGraphQL mode). */
export interface ProductVariation {
  id: number; // Woo databaseId
  name: string;
  price: number;
  regularPrice: number | null;
  onSale: boolean;
  image: string | null;
  stockQuantity: number | null;
  stockStatus: StockStatus;
  /** Attribute NAME → selected value ('' means "any"). */
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  /** Woo `databaseId` (WP mode) — required for cart/checkout mutations. */
  databaseId?: number;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  regularPrice: number | null;
  onSale: boolean;
  image: string;
  gallery: string[];
  stockQuantity: number;
  stockStatus: StockStatus;
  featured: boolean;
  rating: number;
  reviewCount: number;
  badge: string | null;
  attributes: ProductAttribute[];
  categorySlug: string;
  categoryName: string;
  /** Present for variable products (WP mode) — used to resolve addToCart. */
  variations?: ProductVariation[];
  /** ACF fragranceDetails — present only when at least one field has data. */
  fragrance?: FragranceDetails;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  description: string;
  image: string;
  count: number;
}

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export interface ProductQuery {
  category?: string | null;
  featured?: boolean;
  search?: string | null;
  sort?: ProductSort;
  limit?: number;
}

// A single line in the cart. In local mode `key` is a synthetic
// product+options key; in WP mode it is the WooGraphQL cart item key.
export interface CartLine {
  key: string;
  productId: string;
  variationId: number | null;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  options: Record<string, string>;
  maxQuantity: number;
}

/** Totals reported by the WooCommerce cart session (WP mode). */
export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface WooCartSnapshot {
  lines: CartLine[];
  totals: CartTotals | null;
  itemCount: number;
}

export type ShippingMethod = 'standard' | 'express';
export type PaymentMethod = 'cod' | 'card';

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
  notes?: string;
}

export interface OrderPayload {
  customer: OrderCustomer;
  items: { productId: string; quantity: number }[];
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
}

export interface OrderResult {
  orderNumber: string;
  subtotal: number;
  shipping: number;
  total: number;
  email: string;
  createdAt: string;
}

export const FREE_SHIPPING_THRESHOLD = 75;
export const STANDARD_SHIPPING = 6.9;
export const EXPRESS_SHIPPING = 14.9;

export function computeShipping(method: ShippingMethod, subtotal: number): number {
  if (method === 'express') return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

export function formatPrice(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
