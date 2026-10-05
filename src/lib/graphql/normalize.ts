// FORMA Store — WooGraphQL → internal domain normalizers.
//
// The live WordPress API returns WooGraphQL content shapes (money as
// formatted strings like "$10.00", stock enums, attribute nodes split across
// product-type fragments). These helpers map them onto the app's own
// Product / Category / CartLine contract so the UI never sees the difference.

import type {
  CartLine,
  CartTotals,
  Category,
  FragranceDetails,
  Product,
  ProductAttribute,
  ProductVariation,
  StockStatus,
  WooCartSnapshot,
} from '@/lib/types';

 
type Woo = any;

// Local fallback shown for products with no featured image on the WP side
// (next/image throws on an empty src, so every product must carry a URL).
// Upload real featured images in WooCommerce to replace these per product.
export const PRODUCT_PLACEHOLDER = '/images/placeholder-product.png';

/** Parse one money token: "80,050.00" → 80050, "10,50" → 10.5. */
function parseMoneyToken(token: string): number | null {
  const withDots = token.replace(/,/g, '.');
  const normalized = withDots.includes('.')
    ? withDots.replace(/\.(?=.*\.)/g, '') // keep last dot only
    : withDots;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

const MONEY_GROUP = /\d+(?:[.,]\d+)*/g;

/**
 * "$10.00" / "10,00 $" / 10 → 10. Returns null when unparseable OR when the
 * string is a price RANGE ("$5.00 - $30.00" → two number groups) — WooGraphQL
 * returns ranges for variable products, and concatenating both amounts used
 * to produce garbage like $80,050. Use `parseMoneyRange` for those.
 */
export function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const groups = value.match(MONEY_GROUP);
  if (!groups || groups.length === 0) return null;
  if (groups.length > 1) return null; // range string, not a single amount
  return parseMoneyToken(groups[0]);
}

/** Parse a Woo price range ("$5.00 - $30.00") into { min, max }. */
export function parseMoneyRange(value: unknown): { min: number; max: number } | null {
  if (typeof value === 'number') return Number.isFinite(value) ? { min: value, max: value } : null;
  if (typeof value !== 'string') return null;
  const groups = (value.match(MONEY_GROUP) ?? []).map(parseMoneyToken);
  if (groups.length === 0 || groups.some((g) => g === null)) return null;
  const nums = groups as number[];
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export function mapStockStatus(status: unknown, quantity: unknown): StockStatus {
  if (status === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
  const qty = typeof quantity === 'number' ? quantity : null;
  if (qty !== null && qty > 0 && qty <= 5) return 'LOW_STOCK';
  if (status === 'LOW_STOCK') return 'LOW_STOCK';
  return 'IN_STOCK';
}

/** "Size" / "pa_size" → "size" — stable key for option matching. */
export function attrKey(name: string): string {
  return name.toLowerCase().replace(/^pa_/, '');
}

export function normalizeAttributes(nodes: Woo): ProductAttribute[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((n) => n && typeof n.name === 'string')
    .map((n) => {
      const rawName = String(n.name);
      // Global attributes come through as "pa_size" — display "size".
      const displayName = rawName.replace(/^pa_/, '');
      return {
        name: displayName,
        slug: typeof n.slug === 'string' && n.slug ? n.slug : attrKey(rawName),
        options: Array.isArray(n.options) ? n.options.map(String) : [],
      };
    });
}

function normalizeVariation(node: Woo): ProductVariation | null {
  if (!node?.databaseId) return null;
  const price = parseMoney(node.salePrice ?? node.price) ?? parseMoney(node.price) ?? 0;
  const regularPrice = parseMoney(node.regularPrice);
  const attributes: Record<string, string> = {};
  for (const a of node.attributes?.nodes ?? []) {
    if (a?.name) attributes[String(a.name)] = a.value == null ? '' : String(a.value);
  }
  return {
    id: Number(node.databaseId),
    name: String(node.name ?? ''),
    price,
    regularPrice: regularPrice && regularPrice > price ? regularPrice : null,
    onSale: Boolean(node.onSale) || (!!regularPrice && regularPrice > price),
    image: node.image?.sourceUrl ?? null,
    stockQuantity: typeof node.stockQuantity === 'number' ? node.stockQuantity : null,
    stockStatus: mapStockStatus(node.stockStatus, node.stockQuantity),
    attributes,
  };
}

function normalizeVariations(nodes: Woo): ProductVariation[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(normalizeVariation).filter((v): v is ProductVariation => v !== null);
}

function firstCategory(node: Woo): { slug: string; name: string } {
  const cat = node?.productCategories?.nodes?.[0];
  return { slug: String(cat?.slug ?? 'shop'), name: String(cat?.name ?? 'Shop') };
}

// ── Fragrance details (ACF) ─────────────────────────────────────────────────

/** "Bergamot, Pink Pepper" / ["Bergamot","Pink Pepper"] → clean note list. */
function normalizeNotes(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return parts
    .map((p) => String(p).replace(/<[^>]*>/g, '').trim())
    .filter((p) => p.length > 0);
}

/** "20" / 20 / "20,5" → 0–100 integer, or null when unset/unparseable. */
function normalizeSillage(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value.replace(',', '.'))
        : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * ACF fragranceDetails → FragranceDetails | undefined (omitted when empty so
 * the UI can render purely conditionally).
 *
 * Tolerant by design — notes accept a comma string or an array, sillage a
 * number or a numeric string. To support MORE ACF fields later: add them to
 * the GraphQL document in queries.ts, parse them here, and extend the
 * FragranceDetails interface. Nothing else changes.
 */
export function normalizeFragranceDetails(raw: Woo): FragranceDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const topNotes = normalizeNotes(raw.topNotes);
  const heartNotes = normalizeNotes(raw.hartNotes ?? raw.heartNotes);
  const baseNotes = normalizeNotes(raw.baseNotes);
  const sillageValue = normalizeSillage(raw.sillageValue);
  const empty =
    topNotes.length === 0 &&
    heartNotes.length === 0 &&
    baseNotes.length === 0 &&
    sillageValue === null;
  if (empty) return undefined;
  return { topNotes, heartNotes, baseNotes, sillageValue };
}

/** Full product node (catalog + product page). */
export function normalizeProduct(node: Woo): Product {
  const variations = normalizeVariations(node?.variations?.nodes);

  let attributes = normalizeAttributes(node?.attributes?.nodes);
  if (variations.length > 0) {
    // Restrict each attribute's option list to values that actually map to a
    // purchasable variation — Woo products can carry option entries with no
    // matching variation (unpurchasable).
    attributes = attributes.map((a) => {
      const concrete = new Set<string>();
      let anyAllowed = false;
      for (const v of variations) {
        const val = v.attributes[attrKey(a.name)] ?? v.attributes[a.name] ?? '';
        if (val) concrete.add(val);
        else anyAllowed = true;
      }
      if (concrete.size === 0) return a; // every variation is "any" → all options valid
      const allowed = anyAllowed
        ? Array.from(new Set([...concrete, ...a.options]))
        : Array.from(concrete);
      return { ...a, options: allowed };
    });
  }

  // Parent-level price fields on VARIABLE products come back as ranges
  // ("$5.00 - $30.00") which parseMoney rejects → fall back to the cheapest
  // variation ("From $X" semantics, matching Woo). Cards can show a sane
  // "From" price; the product page binds the price to the selected variation.
  const parentPrice =
    parseMoney(node?.salePrice ?? node?.price) ?? parseMoney(node?.price);
  const price =
    parentPrice ??
    (variations.length > 0 ? Math.min(...variations.map((v) => v.price)) : 0);

  const parentRegular = parseMoney(node?.regularPrice);
  const variationRegulars = variations
    .map((v) => v.regularPrice)
    .filter((r): r is number => typeof r === 'number' && r > 0);
  const minVariationRegular =
    variationRegulars.length > 0 ? Math.min(...variationRegulars) : null;
  const regularPrice =
    parentRegular ??
    (minVariationRegular != null && minVariationRegular > price ? minVariationRegular : null);
  const image = node?.image?.sourceUrl || PRODUCT_PLACEHOLDER;
  const gallery = (node?.galleryImages?.nodes ?? [])
    .map((g: Woo) => g?.sourceUrl as string | undefined)
    .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
  const cat = firstCategory(node);
  const stockStatus = mapStockStatus(node?.stockStatus, node?.stockQuantity);
  const fragrance = normalizeFragranceDetails(node?.fragranceDetails);

  return {
    id: String(node?.id ?? node?.databaseId ?? ''),
    databaseId: node?.databaseId != null ? Number(node.databaseId) : undefined,
    slug: String(node?.slug ?? ''),
    name: String(node?.name ?? ''),
    shortDescription: String(node?.shortDescription ?? '').replace(/<[^>]*>/g, '').trim(),
    description: String(node?.description ?? ''),
    price,
    regularPrice: regularPrice && regularPrice > price ? regularPrice : null,
    onSale: Boolean(node?.onSale),
    image,
    gallery: gallery.length > 0 ? gallery : image
      ? [image]
      : [],
    stockQuantity: typeof node?.stockQuantity === 'number' ? node.stockQuantity : 99,
    stockStatus,
    featured: Boolean(node?.featured),
    rating: typeof node?.averageRating === 'number' ? node.averageRating : 0,
    reviewCount: typeof node?.reviewCount === 'number' ? node.reviewCount : 0,
    badge: null,
    attributes,
    categorySlug: cat.slug,
    categoryName: cat.name,
    ...(variations.length > 0 ? { variations } : {}),
    ...(fragrance ? { fragrance } : {}),
  };
}

/** Related-product node — partial fields, padded with defaults. */
export function normalizeProductSummary(node: Woo): Product {
  const base = normalizeProduct(node);
  return {
    ...base,
    shortDescription: base.shortDescription || '',
    description: base.description || '',
    gallery: base.image ? [base.image] : [],
    stockQuantity: typeof node?.stockQuantity === 'number' ? node.stockQuantity : 99,
    attributes: base.attributes ?? [],
  };
}

export function normalizeCategory(node: Woo): Category {
  return {
    id: String(node?.id ?? node?.databaseId ?? ''),
    slug: String(node?.slug ?? ''),
    name: String(node?.name ?? ''),
    nameAr: null,
    description: String(node?.description ?? '').replace(/<[^>]*>/g, '').trim(),
    image: node?.image?.sourceUrl ?? '',
    count: node?.products?.nodes?.length ?? 0,
  };
}

// ── Cart ────────────────────────────────────────────────────────────────────

function normalizeCartLine(node: Woo): CartLine | null {
  const product = node?.product?.node;
  const variation = node?.variation?.node;
  if (!node?.key || !product) return null;

  const price =
    parseMoney(variation?.salePrice ?? variation?.price) ??
    parseMoney(variation?.price) ??
    parseMoney(product?.salePrice ?? product?.price) ??
    parseMoney(product?.price) ??
    0;

  // Selected options for display — variation attributes, skipping "any" (empty).
  const options: Record<string, string> = {};
  for (const a of variation?.attributes?.nodes ?? []) {
    if (a?.name && a?.value) options[attrKey(String(a.name))] = String(a.value);
  }

  const stockQty =
    typeof variation?.stockQuantity === 'number'
      ? variation.stockQuantity
      : typeof product?.stockQuantity === 'number'
        ? product.stockQuantity
        : null;
  const stockStatus = mapStockStatus(variation?.stockStatus ?? product?.stockStatus, stockQty);

  return {
    key: String(node.key),
    productId: String(product.databaseId ?? product.id ?? ''),
    variationId: variation?.databaseId != null ? Number(variation.databaseId) : null,
    slug: String(product.slug ?? ''),
    name: String(product.name ?? ''),
    image:
      variation?.image?.sourceUrl ??
      product?.image?.sourceUrl ??
      PRODUCT_PLACEHOLDER,
    price,
    quantity: typeof node.quantity === 'number' ? node.quantity : 1,
    options,
    maxQuantity: Math.max(1, stockStatus === 'OUT_OF_STOCK' ? 1 : (stockQty ?? 99)),
  };
}

export function normalizeCartSnapshot(cart: Woo): WooCartSnapshot {
  const contents = cart?.contents;
  const lines = (contents?.nodes ?? [])
    .map(normalizeCartLine)
    .filter((l: CartLine | null): l is CartLine => l !== null);

  const totals: CartTotals = {
    subtotal: parseMoney(cart?.subtotal) ?? lines.reduce((a, l) => a + l.price * l.quantity, 0),
    shipping: parseMoney(cart?.shippingTotal) ?? 0,
    tax: parseMoney(cart?.totalTax) ?? 0,
    total: parseMoney(cart?.total) ?? 0,
  };

  return {
    lines,
    totals,
    itemCount: typeof contents?.itemCount === 'number' ? contents.itemCount : lines.reduce((a, l) => a + l.quantity, 0),
  };
}

export const emptyCartSnapshot: WooCartSnapshot = { lines: [], totals: null, itemCount: 0 };
