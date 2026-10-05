// FORMA Store — client-side commerce data layer.
//
// Pure frontend: every read/write goes straight to the live WordPress
// endpoint via the WPGraphQL client in `@/lib/graphql/client`. There is
// no local DB, no /api fallback — the storefront IS the WordPress +
// WooCommerce catalog, cart, and checkout.

import {
  gqlFetch,
  isSessionError,
  clearWooSession,
} from '@/lib/graphql/client';
import {
  GET_CATEGORIES,
  GET_PRODUCTS,
  GET_PRODUCT_BY_SLUG,
  GET_CART,
  ADD_TO_CART,
  UPDATE_CART_QUANTITIES,
  REMOVE_ITEMS_FROM_CART,
  CHECKOUT,
} from '@/lib/graphql/queries';
import {
  emptyCartSnapshot,
  normalizeCartSnapshot,
  normalizeCategory,
  normalizeProduct,
  normalizeProductSummary,
  attrKey,
} from '@/lib/graphql/normalize';
import type {
  Category,
  Product,
  ProductQuery,
  ProductSort,
  ProductVariation,
  WooCartSnapshot,
} from '@/lib/types';

/** Woo payment gateway id used at checkout (configurable, defaults to COD). */
export const WP_PAYMENT_METHOD = process.env.NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD || 'cod';

// ──────────────────────────────── helpers ───────────────────────────────────

function applySort(products: Product[], sort: ProductSort | undefined): Product[] {
  const list = [...products];
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'newest':
      return list.sort((a, b) => (b.databaseId ?? 0) - (a.databaseId ?? 0));
    case 'featured':
    default:
      return list.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating
      );
  }
}

/** Session was rejected — drop the stale token so the next request starts fresh. */
function handleSessionError(err: unknown): void {
  if (isSessionError(err)) clearWooSession();
}

// ─────────────────────────── WP mode: catalog ───────────────────────────────

 
type Woo = any;

async function wpGetProducts(query: ProductQuery): Promise<Product[]> {
  const data = await gqlFetch<{ products: Woo }>(GET_PRODUCTS, {
    first: Math.min(query.limit ?? 100, 100),
    category: query.category ?? null,
    search: query.search ?? null,
  });
  let products: Product[] = (data.products?.nodes ?? []).map(normalizeProduct);
  if (query.featured) {
    const featuredOnly = products.filter((p) => p.featured);
    // The altaha.shop catalog currently has NO product flagged "featured"
    // (feature flag is set per-product in WooCommerce admin). Fall back to
    // the top of the list so the storefront's Featured rail never renders
    // as an empty hole; once the merchant flags products in Woo, those win.
    products = featuredOnly.length > 0 ? featuredOnly : products;
  }
  return applySort(products, query.sort);
}

async function wpGetProduct(slug: string): Promise<{ product: Product; related: Product[] }> {
  const data = await gqlFetch<{ product: Woo }>(GET_PRODUCT_BY_SLUG, { slug });
  if (!data.product) throw new Error(`Product "${slug}" not found`);
  return {
    product: normalizeProduct(data.product),
    related: (data.product.related?.nodes ?? []).map(normalizeProductSummary),
  };
}

async function wpGetCategories(): Promise<Category[]> {
  const data = await gqlFetch<{ productCategories: Woo }>(GET_CATEGORIES);
  return (data.productCategories?.nodes ?? []).map(normalizeCategory);
}

// ───────────────────────── WP mode: cart & checkout ─────────────────────────

export interface ResolvedVariation {
  variationId: number | null;
  variationAttributes: { attributeName: string; attributeValue: string }[];
}

/** Case/spacing-insensitive attribute value comparison ("30ML" ≈ "30ml"). */
function attrValueEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Find the variation matching the selected options by comparing each
 * variation's concrete attributes against the selection. Attributes with an
 * empty value mean "any" and match every selection. Returns null when no
 * variation matches (incomplete selection / unpurchasable combo).
 */
export function findVariation(
  product: Product,
  options: Record<string, string>
): ProductVariation | null {
  const variations = product.variations ?? [];
  if (variations.length === 0) return null;
  return (
    variations.find((v) =>
      Object.entries(v.attributes).every(([name, value]) => {
        if (!value) return true; // "any"
        const key = attrKey(name);
        const selected =
          options[key] ??
          options[name] ??
          Object.entries(options).find(([k]) => attrKey(k) === key)?.[1];
        return selected != null && attrValueEq(selected, value);
      })
    ) ?? null
  );
}

/**
 * Resolve the selected options to a Woo variation for cart mutations. Falls
 * back to the first variation when nothing matches (Woo requires a concrete
 * variation id for variable products).
 */
export function resolveVariation(
  product: Product,
  options: Record<string, string>
): ResolvedVariation {
  const variations = product.variations ?? [];
  if (variations.length === 0) {
    return { variationId: null, variationAttributes: [] };
  }

  const chosen = findVariation(product, options) ?? variations[0];

  // Woo validates posted attributes against the resolved variation: concrete
  // values MUST equal the variation's own value, "any" attributes accept the
  // user's selection (or the first option).
  const variationAttributes = product.attributes
    .filter((a) => a.options.length > 0)
    .map((a) => {
      const key = attrKey(a.name);
      const concrete = chosen.attributes[key] ?? chosen.attributes[a.name] ?? '';
      const selected =
        options[a.slug] ?? options[key] ?? options[a.name] ?? a.options[0] ?? '';
      return {
        attributeName: a.name,
        attributeValue: concrete || selected,
      };
    });

  return { variationId: chosen.id, variationAttributes };
}

export async function wpFetchCart(): Promise<WooCartSnapshot> {
  try {
    const data = await gqlFetch<{ cart: Woo }>(GET_CART);
    return data.cart ? normalizeCartSnapshot(data.cart) : emptyCartSnapshot;
  } catch (err) {
    handleSessionError(err);
    throw err;
  }
}

export async function wpAddToCart(
  product: Product,
  options: Record<string, string>,
  quantity: number
): Promise<WooCartSnapshot> {
  const { variationId, variationAttributes } = resolveVariation(product, options);
  try {
    const data = await gqlFetch<{ addToCart: Woo }>(ADD_TO_CART, {
      productId: product.databaseId ?? Number(product.id),
      variationId,
      quantity,
      variation: variationAttributes,
    });
    return normalizeCartSnapshot(data.addToCart?.cart);
  } catch (err) {
    handleSessionError(err);
    throw err;
  }
}

export async function wpUpdateQuantity(key: string, quantity: number): Promise<WooCartSnapshot> {
  try {
    const data = await gqlFetch<{ updateItemQuantities: Woo }>(UPDATE_CART_QUANTITIES, {
      key,
      quantity,
    });
    return normalizeCartSnapshot(data.updateItemQuantities?.cart);
  } catch (err) {
    handleSessionError(err);
    throw err;
  }
}

export async function wpRemoveItems(keys: string[]): Promise<WooCartSnapshot> {
  try {
    const data = await gqlFetch<{ removeItemsFromCart: Woo }>(REMOVE_ITEMS_FROM_CART, { keys });
    return normalizeCartSnapshot(data.removeItemsFromCart?.cart);
  } catch (err) {
    handleSessionError(err);
    throw err;
  }
}

export interface WpCheckoutInput {
  billing: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
    phone: string;
  };
  customerNote?: string;
  paymentMethod: string;
}

export interface WpCheckoutResult {
  orderNumber: string;
  total: number;
  status: string;
  result: string;
  redirect: string | null;
}

export async function wpCheckout(input: WpCheckoutInput): Promise<WpCheckoutResult> {
  const data = await gqlFetch<{ checkout: Woo }>(
    CHECKOUT,
    {
      input: {
        billing: {
          firstName: input.billing.firstName,
          lastName: input.billing.lastName,
          address1: input.billing.address1,
          address2: input.billing.address2 ?? '',
          city: input.billing.city,
          state: input.billing.state ?? '',
          postcode: input.billing.postcode,
          country: input.billing.country,
          email: input.billing.email,
          phone: input.billing.phone,
        },
        shipping: {
          firstName: input.shipping.firstName,
          lastName: input.shipping.lastName,
          address1: input.shipping.address1,
          address2: input.shipping.address2 ?? '',
          city: input.shipping.city,
          state: input.shipping.state ?? '',
          postcode: input.shipping.postcode,
          country: input.shipping.country,
          phone: input.shipping.phone,
        },
        customerNote: input.customerNote ?? '',
        paymentMethod: input.paymentMethod,
        isPaid: false,
      },
    },
    { timeoutMs: 60_000 }
  );
  const order = data.checkout?.order;
  if (!order) throw new Error('Checkout did not return an order');
  return {
    orderNumber: String(order.orderNumber ?? order.databaseId ?? ''),
    total: parseFloat(String(order.total).replace(/[^0-9.]/g, '')) || 0,
    status: String(order.status ?? ''),
    result: String(data.checkout?.result ?? 'success'),
    redirect: data.checkout?.redirect ?? null,
  };
}

// ─────────────────────────── public API surface ─────────────────────────────

export const getProducts = wpGetProducts;
export const getProduct = wpGetProduct;
export const getCategories = wpGetCategories;
