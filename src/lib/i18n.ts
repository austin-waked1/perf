'use client';

// FORMA Store — lightweight i18n with RTL support (EN / AR).
// The store keeps UI strings bilingual; product content is served by the
// commerce backend (WooGraphQL in production, local adapter in this sandbox).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Lang = 'en' | 'ar';

const en = {
  // Brand / nav
  brand: 'FORMA',
  tagline: 'Modern Essentials',
  nav_home: 'Home',
  nav_shop: 'Shop',
  nav_categories: 'Categories',
  nav_about: 'About',
  cart: 'Cart',
  menu: 'Menu',
  close: 'Close',
  language: 'Language',

  // Hero
  hero_badge: 'New Season — FW Collection',
  hero_title_1: 'Essentials designed',
  hero_title_2: 'to outlast trends.',
  hero_subtitle:
    'Considered wardrobe foundations, accessories and objects for the home — made from natural materials, built to be kept.',
  hero_cta_primary: 'Shop the collection',
  hero_cta_secondary: 'Explore categories',
  hero_stat_1: 'Natural materials',
  hero_stat_2: 'Free shipping over $75',
  hero_stat_3: '30-day returns',
  hero_rating: 'Loved by 2,000+ customers',
  hero_scroll: 'Scroll to explore',
  hero_view_product: 'View product',
  hero_prev: 'Previous product',
  hero_next: 'Next product',
  hero_slide_status: 'Product {i} of {n}',

  // Sections
  categories_title: 'Shop by category',
  categories_subtitle: 'Four edits, zero noise.',
  featured_title: 'Featured products',
  featured_subtitle: 'Hand-picked pieces our customers keep coming back to.',
  view_all: 'View all',
  shop_title: 'All products',
  shop_subtitle: 'Every piece in the collection.',
  products_count: '{count} products',
  all_filter: 'All',
  sort_label: 'Sort',
  sort_featured: 'Featured',
  sort_price_asc: 'Price: low to high',
  sort_price_desc: 'Price: high to low',
  sort_rating: 'Top rated',
  sort_newest: 'Newest',
  search_placeholder: 'Search products…',
  no_results: 'No products match your filters.',
  clear_filters: 'Clear filters',
  load_more: 'That\'s everything for now',

  // Value props
  prop_shipping_title: 'Free shipping',
  prop_shipping_desc: 'On all orders over $75',
  prop_returns_title: 'Easy returns',
  prop_returns_desc: '30 days, no questions asked',
  prop_secure_title: 'Secure checkout',
  prop_secure_desc: 'Encrypted end to end',
  prop_craft_title: 'Made to last',
  prop_craft_desc: 'Natural, durable materials',

  // Product card
  add_to_cart: 'Add to cart',
  adding: 'Adding…',
  added: 'Added to cart',
  quick_add: 'Quick add',
  sale: 'Sale',
  bestseller: 'Bestseller',
  new: 'New',
  sold_out: 'Sold out',
  from_price: 'From',

  // Product page
  back_to_shop: 'Back to shop',
  breadcrumb_home: 'Home',
  pdp_wishlist_add: 'Add to wishlist',
  pdp_wishlist_saved: 'Saved to wishlist',
  reviews: '{count} reviews',
  in_stock: 'In stock',
  low_stock: 'Only {count} left',
  out_of_stock: 'Out of stock',
  quantity: 'Quantity',
  select_options: 'Choose options',
  description_title: 'Description',
  details_title: 'Details & care',
  shipping_title: 'Shipping & returns',

  // Fragrance details (ACF)
  fragrance_title: 'Fragrance notes',
  fragrance_top: 'Top notes',
  fragrance_heart: 'Heart notes',
  fragrance_base: 'Base notes',
  fragrance_sillage: 'Sillage',
  shipping_body: 'Orders ship within 1–2 business days. Standard shipping is free over $75, otherwise $6.90. Express delivery available at checkout. Returns are accepted within 30 days — items must be unworn with tags attached.',
  details_body: 'Natural fibres. Pre-washed and garment-dyed in small batches. Follow the care label — wash cold, hang dry, and it will outlive the trend cycle.',
  related_title: 'You may also like',
  choose_option_first: 'Please select the options first',
  view_product: 'View product',

  // Cart
  cart_title: 'Your cart',
  cart_empty: 'Your cart is empty',
  cart_empty_desc: 'Looks like you haven\'t added anything yet.',
  cart_empty_cta: 'Start shopping',
  cart_view: 'View cart',
  checkout: 'Checkout',
  continue_shopping: 'Continue shopping',
  subtotal: 'Subtotal',
  shipping_label: 'Shipping',
  free: 'Free',
  total: 'Total',
  remove: 'Remove',
  remove_item: 'Remove item',
  free_shipping_progress: 'You\'re {amount} away from free shipping',
  free_shipping_unlocked: 'You\'ve unlocked free shipping',
  cart_note: 'Shipping & taxes calculated at checkout',
  tax_label: 'Tax',
  cart_sync_error: 'Cart sync failed',
  wp_gateway_hint: 'No payment gateway is enabled on the WordPress store — enable one under WooCommerce → Settings → Payments.',
  wp_card_unsupported_title: 'Card payments unavailable',
  wp_card_unsupported_desc: 'Card processing is handled by the store\'s payment gateway. Please choose Cash on delivery.',
  wp_shipping_store_note: 'Shipping rates are calculated by the WordPress store for your delivery address and applied to your order total.',
  item_removed: 'Item removed',

  // Checkout
  checkout_title: 'Checkout',
  order_summary: 'Order summary',
  contact_section: 'Contact',
  shipping_section: 'Shipping address',
  payment_section: 'Payment',
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  address: 'Street address',
  address2: 'Apartment, suite, etc. (optional)',
  city: 'City',
  state: 'State / Region (optional)',
  postcode: 'Postal code',
  country: 'Country',
  notes: 'Order notes (optional)',
  notes_placeholder: 'Delivery instructions, gift note…',
  shipping_method: 'Shipping method',
  standard_shipping: 'Standard',
  standard_shipping_desc: '3–5 business days',
  express_shipping: 'Express',
  express_shipping_desc: '1–2 business days',
  cod: 'Cash on delivery',
  cod_desc: 'Pay when your order arrives',
  card: 'Credit / debit card',
  card_desc: 'Demo gateway — no real charge',
  card_number: 'Card number',
  card_expiry: 'Expiry (MM/YY)',
  card_cvc: 'CVC',
  place_order: 'Place order',
  placing_order: 'Placing order…',
  discount_row: 'Discount',
  items_row: '{count} items',

  // Success
  success_title: 'Thank you!',
  success_subtitle: 'Your order has been placed.',
  order_number: 'Order number',
  success_email: 'A confirmation has been sent to {email}.',
  success_note: 'This is a demo storefront — no payment was captured and nothing will ship.',
  back_home: 'Back to home',

  // Footer
  footer_about: 'Considered essentials for modern living. Designed in small batches from natural materials.',
  footer_shop: 'Shop',
  footer_help: 'Help',
  footer_faq: 'FAQ',
  footer_shipping_returns: 'Shipping & returns',
  footer_contact: 'Contact',
  footer_privacy: 'Privacy policy',
  footer_terms: 'Terms of service',
  footer_newsletter: 'Join the list',
  footer_newsletter_desc: 'New pieces, restocks and occasional letters. No spam.',
  footer_email_placeholder: 'Your email address',
  footer_subscribe: 'Subscribe',
  footer_subscribed: 'You\'re on the list — welcome.',
  footer_invalid_email: 'Please enter a valid email',
  footer_rights: '© {year} FORMA Studio. All rights reserved.',
  footer_demo: 'Demo storefront powered by a WooGraphQL-compatible API.',

  // Misc
  error_title: 'Something went wrong',
  error_desc: 'We couldn\'t load the store data. Please try again.',
  retry: 'Retry',
  loading: 'Loading…',
  theme_toggle: 'Toggle theme',
  switch_lang: 'العربية',
};

const ar: typeof en = {
  brand: 'فورما',
  tagline: 'إساسيات عصرية',
  nav_home: 'الرئيسية',
  nav_shop: 'المتجر',
  nav_categories: 'الفئات',
  nav_about: 'من نحن',
  cart: 'السلة',
  menu: 'القائمة',
  close: 'إغلاق',
  language: 'اللغة',

  hero_badge: 'موسم جديد — مجموعة خريف/شتاء',
  hero_title_1: 'إساسيات مصممة',
  hero_title_2: 'لتبقى أطول من الصيحات.',
  hero_subtitle:
    'قطع أساسية للملابس والإكسسوارات ومستلزمات المنزل — من مواد طبيعية وصُنعت لتدوم.',
  hero_cta_primary: 'تسوق المجموعة',
  hero_cta_secondary: 'استكشف الفئات',
  hero_stat_1: 'مواد طبيعية',
  hero_stat_2: 'شحن مجاني للطلبات فوق ٧٥$',
  hero_stat_3: 'إرجاع خلال ٣٠ يوماً',
  hero_rating: 'محبوب من أكثر من ٢٠٠٠ عميل',
  hero_scroll: 'مرّر للاستكشاف',
  hero_view_product: 'عرض المنتج',
  hero_prev: 'المنتج السابق',
  hero_next: 'المنتج التالي',
  hero_slide_status: 'المنتج {i} من {n}',

  categories_title: 'تسوق حسب الفئة',
  categories_subtitle: 'أربع فئات، بلا ضجيج.',
  featured_title: 'منتجات مميزة',
  featured_subtitle: 'قطع مختارة بعناية يعود إليها عملاؤنا دائماً.',
  view_all: 'عرض الكل',
  shop_title: 'جميع المنتجات',
  shop_subtitle: 'كل قطعة في المجموعة.',
  products_count: '{count} منتج',
  all_filter: 'الكل',
  sort_label: 'ترتيب',
  sort_featured: 'المميزة',
  sort_price_asc: 'السعر: من الأقل للأعلى',
  sort_price_desc: 'السعر: من الأعلى للأقل',
  sort_rating: 'الأعلى تقييماً',
  sort_newest: 'الأحدث',
  search_placeholder: 'ابحث عن منتج…',
  no_results: 'لا توجد منتجات تطابق عوامل التصفية.',
  clear_filters: 'مسح عوامل التصفية',
  load_more: 'هذا كل شيء حالياً',

  prop_shipping_title: 'شحن مجاني',
  prop_shipping_desc: 'للطلبات فوق ٧٥$',
  prop_returns_title: 'إرجاع سهل',
  prop_returns_desc: '٣٠ يوماً بلا أسئلة',
  prop_secure_title: 'دفع آمن',
  prop_secure_desc: 'تشفير كامل للبيانات',
  prop_craft_title: 'صُنع ليدوم',
  prop_craft_desc: 'مواد طبيعية ومتينة',

  add_to_cart: 'أضف إلى السلة',
  adding: 'جارٍ الإضافة…',
  added: 'تمت الإضافة إلى السلة',
  quick_add: 'إضافة سريعة',
  sale: 'تخفيض',
  bestseller: 'الأكثر مبيعاً',
  new: 'جديد',
  sold_out: 'نفدت الكمية',
  from_price: 'ابتداءً من',

  back_to_shop: 'العودة للمتجر',
  breadcrumb_home: 'الرئيسية',
  pdp_wishlist_add: 'أضف إلى المفضلة',
  pdp_wishlist_saved: 'محفوظة في المفضلة',
  reviews: '{count} تقييماً',
  in_stock: 'متوفر',
  low_stock: 'بقي {count} فقط',
  out_of_stock: 'غير متوفر',
  quantity: 'الكمية',
  select_options: 'اختر الخيارات',
  description_title: 'الوصف',
  details_title: 'التفاصيل والعناية',
  shipping_title: 'الشحن والإرجاع',

  // Fragrance details (ACF)
  fragrance_title: 'المكونات العطرية',
  fragrance_top: 'مقدمة العطر',
  fragrance_heart: 'قلب العطر',
  fragrance_base: 'قاعدة العطر',
  fragrance_sillage: 'انتشار العطر',
  shipping_body: 'يتم شحن الطلبات خلال ١-٢ يوم عمل. الشحن القياسي مجاني للطلبات فوق ٧٥$، وإلا ٦.٩٠$. التوصيل السريع متاح عند الدفع. يُقبل الإرجاع خلال ٣٠ يوماً بشرط أن تكون القطع غير مستخدمة وبكامل ملصقاتها.',
  details_body: 'ألياف طبيعية، مغسولة مسبقاً ومصبوغة بدفعات صغيرة. اتبع ملصق العناية — اغسل بماء بارد وجفف بالتعليق، لتبقى قطعتك أطول من الموضة.',
  related_title: 'قد يعجبك أيضاً',
  choose_option_first: 'يرجى اختيار الخيارات أولاً',
  view_product: 'عرض المنتج',

  cart_title: 'سلتك',
  cart_empty: 'سلتك فارغة',
  cart_empty_desc: 'يبدو أنك لم تُضف أي شيء بعد.',
  cart_empty_cta: 'ابدأ التسوق',
  cart_view: 'عرض السلة',
  checkout: 'إتمام الطلب',
  continue_shopping: 'متابعة التسوق',
  subtotal: 'المجموع الفرعي',
  shipping_label: 'الشحن',
  free: 'مجاني',
  total: 'الإجمالي',
  remove: 'إزالة',
  remove_item: 'حذف المنتج',
  free_shipping_progress: 'أضف {amount} للحصول على شحن مجاني',
  free_shipping_unlocked: 'حصلت على شحن مجاني',
  cart_note: 'الشحن والضرائب تُحسب عند الدفع',
  tax_label: 'الضريبة',
  cart_sync_error: 'فشل مزامنة السلة',
  wp_gateway_hint: 'لا توجد بوابة دفع مُفعّلة في متجر ووردبريس — فعّل واحدة من WooCommerce ← الإعدادات ← المدفوعات.',
  wp_card_unsupported_title: 'الدفع بالبطاقة غير متاح',
  wp_card_unsupported_desc: 'تتم معالجة المدفوعات بالبطاقة عبر بوابة الدفع في المتجر. يرجى اختيار الدفع عند الاستلام.',
  wp_shipping_store_note: 'يتم حساب تكاليف الشحن من متجر ووردبريس حسب عنوان التوصيل وتُطبّق على إجمالي الطلب.',
  item_removed: 'تم حذف المنتج',

  checkout_title: 'إتمام الطلب',
  order_summary: 'ملخص الطلب',
  contact_section: 'معلومات التواصل',
  shipping_section: 'عنوان الشحن',
  payment_section: 'الدفع',
  first_name: 'الاسم الأول',
  last_name: 'اسم العائلة',
  email: 'البريد الإلكتروني',
  phone: 'الهاتف',
  address: 'عنوان الشارع',
  address2: 'شقة، جناح، إلخ. (اختياري)',
  city: 'المدينة',
  state: 'المنطقة / الولاية (اختياري)',
  postcode: 'الرمز البريدي',
  country: 'الدولة',
  notes: 'ملاحظات الطلب (اختياري)',
  notes_placeholder: 'تعليمات التوصيل، بطاقة إهداء…',
  shipping_method: 'طريقة الشحن',
  standard_shipping: 'قياسي',
  standard_shipping_desc: '٣-٥ أيام عمل',
  express_shipping: 'سريع',
  express_shipping_desc: '١-٢ يوم عمل',
  cod: 'الدفع عند الاستلام',
  cod_desc: 'ادفع عند وصول طلبك',
  card: 'بطاقة ائتمان / خصم',
  card_desc: 'بوابة تجريبية — لن يتم أي خصم',
  card_number: 'رقم البطاقة',
  card_expiry: 'تاريخ الانتهاء (شهر/سنة)',
  card_cvc: 'رمز الأمان',
  place_order: 'تأكيد الطلب',
  placing_order: 'جارٍ تأكيد الطلب…',
  discount_row: 'الخصم',
  items_row: '{count} منتج',

  success_title: 'شكراً لك!',
  success_subtitle: 'تم تأكيد طلبك.',
  order_number: 'رقم الطلب',
  success_email: 'تم إرسال تأكيد إلى {email}.',
  success_note: 'هذا متجر تجريبي — لم يتم تحصيل أي مبلغ ولن يتم شحن أي شيء.',
  back_home: 'العودة للرئيسية',

  footer_about: 'إساسيات مدروسة للحياة العصرية. مصممة بدفعات صغيرة من مواد طبيعية.',
  footer_shop: 'المتجر',
  footer_help: 'المساعدة',
  footer_faq: 'الأسئلة الشائعة',
  footer_shipping_returns: 'الشحن والإرجاع',
  footer_contact: 'اتصل بنا',
  footer_privacy: 'سياسة الخصوصية',
  footer_terms: 'شروط الخدمة',
  footer_newsletter: 'انضم إلى القائمة',
  footer_newsletter_desc: 'قطع جديدة، عودة المخزون، ورسائل بين الحين والآخر. بلا إزعاج.',
  footer_email_placeholder: 'بريدك الإلكتروني',
  footer_subscribe: 'اشترك',
  footer_subscribed: 'تم تسجيلك — أهلاً بك.',
  footer_invalid_email: 'يرجى إدخال بريد إلكتروني صحيح',
  footer_rights: '© {year} فورما ستوديو. جميع الحقوق محفوظة.',
  footer_demo: 'متجر تجريبي مدعوم بواجهة متوافقة مع WooGraphQL.',

  error_title: 'حدث خطأ ما',
  error_desc: 'لم نتمكن من تحميل بيانات المتجر. حاول مجدداً.',
  retry: 'إعادة المحاولة',
  loading: 'جارٍ التحميل…',
  theme_toggle: 'تغيير المظهر',
  switch_lang: 'English',
};

export const dictionaries: Record<Lang, typeof en> = { en, ar };

export type Dict = typeof en;

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'en' ? 'ar' : 'en' }),
    }),
    { name: 'forma-lang', storage: createJSONStorage(() => localStorage) }
  )
);

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

/** Hook returning the active dictionary + a translate helper. */
export function useT(): { t: Dict; lang: Lang; isRTL: boolean; setLang: (l: Lang) => void } {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  return { t: dictionaries[lang], lang, isRTL: lang === 'ar', setLang };
}

/** Format a price in the active language. */
export function usePriceFormatter() {
  const lang = useLangStore((s) => s.lang);
  return (value: number) => {
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      numberingSystem: 'latn',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
}
