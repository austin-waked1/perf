'use client';

import { useState } from 'react';
import { ArrowRight, Instagram, Twitter, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/lib/store/ui';
import { useLangStore, useT } from '@/lib/i18n';
import { scrollToId } from '@/components/store/motion';

export function StoreFooter() {
  const { t } = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useUIStore((s) => s.navigate);
  const setShopCategory = useUIStore((s) => s.setShopCategory);
  const [email, setEmail] = useState('');

  const categories = [
    { slug: 'apparel', label: t.nav_shop + ' — ' + (lang === 'ar' ? 'الملابس' : 'Apparel') },
    { slug: 'accessories', label: lang === 'ar' ? 'الإكسسوارات' : 'Accessories' },
    { slug: 'footwear', label: lang === 'ar' ? 'الأحذية' : 'Footwear' },
    { slug: 'home', label: lang === 'ar' ? 'المنزل والمعيشة' : 'Home & Living' },
  ];

  const helpLinks = [t.footer_faq, t.footer_shipping_returns, t.footer_privacy, t.footer_terms];

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      toast.error(t.footer_invalid_email);
      return;
    }
    setEmail('');
    toast.success(t.footer_subscribed);
  };

  const goCategory = (slug: string) => {
    setShopCategory(slug);
    if (useUIStore.getState().view.name !== 'home') navigate({ name: 'home' });
    scrollToId('shop');
  };

  return (
    <footer className="relative mt-auto overflow-hidden rounded-t-[2rem] bg-ink text-white pb-[env(safe-area-inset-bottom)]">
      {/* giant watermark */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-6 z-0 select-none text-center text-[24vw] font-bold leading-none text-white/[0.05] md:text-[13rem]"
      >
        FORMA
      </p>

      <div className="relative z-10 px-5 py-14 sm:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="space-y-4">
            <p className="text-lg font-bold uppercase tracking-[0.22em]">
              {t.brand}
              <span className="ms-1.5 inline-block size-1.5 translate-y-[-3px] rounded-full bg-accent-brand" />
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-white/55">{t.footer_about}</p>
            <div className="flex gap-1">
              {[
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Twitter, label: 'Twitter / X' },
                { Icon: Youtube, label: 'YouTube' },
              ].map(({ Icon, label }) => (
                <Button
                  key={label}
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label={label}
                >
                  <Icon className="size-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* shop */}
          <nav aria-label={t.footer_shop}>
            <h3 className="mb-4 text-sm font-semibold">{t.footer_shop}</h3>
            <ul className="space-y-2.5">
              {categories.map((c) => (
                <li key={c.slug}>
                  <button
                    onClick={() => goCategory(c.slug)}
                    className="text-sm text-white/55 transition-all hover:translate-x-0.5 hover:text-white rtl:hover:-translate-x-0.5"
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* help */}
          <nav aria-label={t.footer_help}>
            <h3 className="mb-4 text-sm font-semibold">{t.footer_help}</h3>
            <ul className="space-y-2.5">
              {helpLinks.map((label) => (
                <li key={label}>
                  <span className="cursor-pointer text-sm text-white/55 transition-colors hover:text-white">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </nav>

          {/* newsletter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t.footer_newsletter}</h3>
            <p className="text-sm text-white/55">{t.footer_newsletter_desc}</p>
            <form onSubmit={subscribe} className="flex gap-2" noValidate>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.footer_email_placeholder}
                className="h-10 rounded-full border-white/15 bg-white/[0.06] text-white placeholder:text-white/40 focus-visible:ring-accent-brand"
                aria-label={t.footer_email_placeholder}
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-white text-ink hover:bg-white/85"
                aria-label={t.footer_subscribe}
              >
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Button>
            </form>
          </div>
        </div>

        <div className="my-8 border-t border-white/10" />

        <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-start">
          <p className="text-xs text-white/45">{t.footer_rights.replace('{year}', String(new Date().getFullYear()))}</p>
          <div className="flex items-center gap-2">
            {['VISA', 'MASTERCARD', 'COD', 'AMEX'].map((p) => (
              <span
                key={p}
                className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold tracking-wider text-white/60"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/45">{t.footer_demo}</p>
        </div>
      </div>
    </footer>
  );
}
