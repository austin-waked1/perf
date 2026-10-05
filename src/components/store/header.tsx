'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, ShoppingBag, Sun, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMounted } from '@/hooks/use-mounted';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCartCount } from '@/lib/store/cart';
import { useUIStore } from '@/lib/store/ui';
import { useLangStore, useT } from '@/lib/i18n';
import { scrollToId } from '@/components/store/motion';
import { cn } from '@/lib/utils';

function Logo({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      onClick={onClick}
      className="flex items-baseline gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      aria-label="FORMA — home"
    >
      <span className="text-lg font-bold tracking-[0.22em] uppercase">{t.brand}</span>
      <span className="size-1.5 rounded-full bg-accent-brand translate-y-[-2px]" aria-hidden />
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useT();
  const mounted = useMounted();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-full"
      aria-label={t.theme_toggle}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={resolvedTheme}
            initial={{ opacity: 0, rotate: -60 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 60 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </motion.span>
        </AnimatePresence>
      ) : (
        <Moon className="size-4 opacity-0" />
      )}
    </Button>
  );
}

function LangToggle() {
  const toggleLang = useLangStore((s) => s.toggleLang);
  const { t } = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 rounded-full px-3 text-xs font-semibold tracking-wide"
      onClick={toggleLang}
      aria-label={t.language}
    >
      {t.switch_lang}
    </Button>
  );
}

export function StoreHeader() {
  const { t, isRTL } = useT();
  const navigate = useUIStore((s) => s.navigate);
  const view = useUIStore((s) => s.view);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const setShopCategory = useUIStore((s) => s.setShopCategory);
  const count = useCartCount();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goHome = () => navigate({ name: 'home' });
  const goShop = () => {
    setShopCategory(null);
    if (view.name !== 'home') navigate({ name: 'home' });
    scrollToId('shop');
    setMenuOpen(false);
  };
  const goCategories = () => {
    if (view.name !== 'home') navigate({ name: 'home' });
    scrollToId('categories');
    setMenuOpen(false);
  };

  const navItems = [
    { label: t.nav_home, action: goHome, active: view.name === 'home' },
    { label: t.nav_shop, action: goShop, active: false },
    { label: t.nav_categories, action: goCategories, active: false },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-all duration-300',
        scrolled
          ? 'border-border bg-background/80 shadow-[0_1px_12px_oklch(0_0_0/0.04)] backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
        {/* mobile menu */}
        <div className="flex items-center gap-1 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label={t.menu}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? 'right' : 'left'} aria-describedby={undefined} className="w-72 px-5">
              <SheetHeader className="px-0">
                <SheetTitle>
                  <Logo onClick={goHome} />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1" aria-label={t.menu}>
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-3 text-start text-base font-medium transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </button>
                ))}
                <Separator className="my-3" />
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm text-muted-foreground">{t.language}</span>
                  <LangToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <Logo onClick={goHome} />
        </div>

        {/* desktop logo */}
        <div className="hidden md:block">
          <Logo onClick={goHome} />
        </div>

        {/* desktop nav */}
        <nav className="absolute start-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex rtl:translate-x-1/2" aria-label="Main">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                item.active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {item.active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-muted"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* actions */}
        <div className="flex items-center gap-0.5">
          <div className="hidden md:block">
            <LangToggle />
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 rounded-full"
            aria-label={t.cart}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-4.5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
                  className="absolute -end-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-brand px-1 text-[10px] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </header>
  );
}
