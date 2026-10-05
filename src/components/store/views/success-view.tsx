'use client';

// Order success view — animated confirmation.

import { motion } from 'framer-motion';
import { ArrowRight, Check, Mail, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/store/ui';
import { useT, usePriceFormatter } from '@/lib/i18n';

interface SuccessViewProps {
  orderNumber: string;
  email: string;
  total: number;
}

export function SuccessView({ orderNumber, email, total }: SuccessViewProps) {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center md:py-28">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.7 }}
        className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', bounce: 0.6, duration: 0.5 }}
          className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white"
        >
          <Check className="size-6" strokeWidth={3} />
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-8"
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.success_title}</h1>
        <p className="mt-2 text-muted-foreground">{t.success_subtitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 w-full space-y-4 rounded-3xl border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.order_number}</span>
          <code className="rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-semibold">
            {orderNumber}
          </code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.total}</span>
          <span className="text-lg font-bold tabular-nums">{formatPrice(total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.email}</span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Mail className="size-3.5 text-muted-foreground" />
            {email}
          </span>
        </div>
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          <PackageOpen className="me-1.5 inline size-3.5" />
          {t.success_note}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-8"
      >
        <Button size="lg" className="h-12 rounded-full px-8 font-semibold" onClick={() => navigate({ name: 'home' })}>
          {t.back_home}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Button>
      </motion.div>
    </div>
  );
}
