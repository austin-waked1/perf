'use client';

// Checkout view — React Hook Form + Zod validation, order summary, and
// the WooGraphQL `checkout` mutation (live WordPress backend).

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, CreditCard, Loader2, ShoppingBag, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCartStore, useCartSubtotal } from '@/lib/store/cart';
import { useUIStore } from '@/lib/store/ui';
import { useT, usePriceFormatter } from '@/lib/i18n';
import { WP_PAYMENT_METHOD, wpCheckout } from '@/lib/commerce';
import { type PaymentMethod } from '@/lib/types';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'TR', label: 'Türkiye' },
  { value: 'EG', label: 'Egypt' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JO', label: 'Jordan' },
  { value: 'MA', label: 'Morocco' },
];

const checkoutSchema = z.object({
  email: z.email({ error: 'Invalid email' }),
  firstName: z.string().min(1, { error: 'Required' }).max(80),
  lastName: z.string().min(1, { error: 'Required' }).max(80),
  phone: z.string().min(6, { error: 'Invalid phone' }).max(30),
  address1: z.string().min(3, { error: 'Required' }).max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1, { error: 'Required' }).max(100),
  state: z.string().max(100).optional(),
  postcode: z.string().min(2, { error: 'Required' }).max(20),
  country: z.string().min(2, { error: 'Required' }),
  notes: z.string().max(500).optional(),
  // demo card fields (required only when payment = card)
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function CheckoutView() {
  const { t } = useT();
  const formatPrice = usePriceFormatter();
  const navigate = useUIStore((s) => s.navigate);
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);
  const serverTotals = useCartStore((s) => s.server);
  const subtotal = useCartSubtotal();

  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [placing, setPlacing] = useState(false);

  // Shipping rates and totals come from the WooCommerce store (server cart).
  const shippingCost = serverTotals?.shipping ?? 0;
  const total = serverTotals ? serverTotals.total : subtotal + shippingCost;

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'US', address2: '', state: '', notes: '' },
    mode: 'onBlur',
  });

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-9 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">{t.cart_empty}</h1>
        <p className="text-sm text-muted-foreground">{t.cart_empty_desc}</p>
        <Button size="lg" className="mt-2 rounded-full px-8" onClick={() => navigate({ name: 'home' })}>
          {t.cart_empty_cta}
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: CheckoutValues) => {
    setPlacing(true);
    try {
      if (payment === 'card') {
        // Card data is never sent to WordPress — the store's own payment
        // gateway handles card processing at checkout.
        toast.error(t.wp_card_unsupported_title, { description: t.wp_card_unsupported_desc });
        setPlacing(false);
        return;
      }

      const result = await wpCheckout({
        billing: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          address1: values.address1,
          address2: values.address2 || '',
          city: values.city,
          state: values.state || '',
          postcode: values.postcode,
          country: values.country,
        },
        shipping: {
          firstName: values.firstName,
          lastName: values.lastName,
          address1: values.address1,
          address2: values.address2 || '',
          city: values.city,
          state: values.state || '',
          postcode: values.postcode,
          country: values.country,
          phone: values.phone,
        },
        customerNote: values.notes || '',
        paymentMethod: WP_PAYMENT_METHOD,
      });
      clear();
      toast.success(t.success_title);
      navigate({
        name: 'success',
        orderNumber: result.orderNumber,
        email: values.email,
        total: result.total,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.error_desc;
      const isGateway = /invalid payment method/i.test(message);
      toast.error(t.error_title, {
        description: isGateway ? `${message} — ${t.wp_gateway_hint}` : message,
      });
    } finally {
      setPlacing(false);
    }
  };

  const register = form.register;
  const errors = form.formState.errors;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <Button
        variant="ghost"
        className="mb-6 -ms-2 rounded-full text-muted-foreground hover:text-foreground"
        onClick={() => navigate({ name: 'cart' })}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t.cart_title}
      </Button>

      <h1 className="mb-8 text-2xl font-bold tracking-tight md:text-4xl">{t.checkout_title}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* form column */}
          <div className="space-y-8">
            {/* contact */}
            <section className="rounded-3xl border bg-card p-6 md:p-7">
              <h2 className="mb-5 font-semibold">{t.contact_section}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="email">{t.email} *</Label>
                  <Input id="email" type="email" className="mt-1.5" placeholder="you@example.com" {...register('email')} />
                  <FieldError message={errors.email?.message} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="phone">{t.phone} *</Label>
                  <Input id="phone" type="tel" className="mt-1.5" placeholder="+90 5xx xxx xx xx" {...register('phone')} />
                  <FieldError message={errors.phone?.message} />
                </div>
              </div>
            </section>

            {/* shipping address */}
            <section className="rounded-3xl border bg-card p-6 md:p-7">
              <h2 className="mb-5 font-semibold">{t.shipping_section}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">{t.first_name} *</Label>
                  <Input id="firstName" className="mt-1.5" {...register('firstName')} />
                  <FieldError message={errors.firstName?.message} />
                </div>
                <div>
                  <Label htmlFor="lastName">{t.last_name} *</Label>
                  <Input id="lastName" className="mt-1.5" {...register('lastName')} />
                  <FieldError message={errors.lastName?.message} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address1">{t.address} *</Label>
                  <Input id="address1" className="mt-1.5" {...register('address1')} />
                  <FieldError message={errors.address1?.message} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address2">{t.address2}</Label>
                  <Input id="address2" className="mt-1.5" {...register('address2')} />
                  <FieldError message={errors.address2?.message} />
                </div>
                <div>
                  <Label htmlFor="city">{t.city} *</Label>
                  <Input id="city" className="mt-1.5" {...register('city')} />
                  <FieldError message={errors.city?.message} />
                </div>
                <div>
                  <Label htmlFor="state">{t.state}</Label>
                  <Input id="state" className="mt-1.5" {...register('state')} />
                  <FieldError message={errors.state?.message} />
                </div>
                <div>
                  <Label htmlFor="postcode">{t.postcode} *</Label>
                  <Input id="postcode" className="mt-1.5" {...register('postcode')} />
                  <FieldError message={errors.postcode?.message} />
                </div>
                <div>
                  <Label>{t.country} *</Label>
                  <ControllerWrapper
                    value={form.watch('country') ?? 'US'}
                    onChange={(v) => form.setValue('country', v, { shouldValidate: true })}
                    placeholder={t.country}
                    options={COUNTRIES}
                  />
                  <FieldError message={errors.country?.message} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">{t.notes}</Label>
                  <Textarea id="notes" rows={3} className="mt-1.5 resize-none" placeholder={t.notes_placeholder} {...register('notes')} />
                </div>
              </div>
            </section>

            {/* shipping method — rates come from the WooCommerce store */}
            <section className="rounded-3xl border bg-card p-6 md:p-7">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Truck className="size-4" />
                {t.shipping_method}
              </h2>
              <p className="flex items-start gap-2 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                {t.wp_shipping_store_note}
              </p>
            </section>

            {/* payment */}
            <section className="rounded-3xl border bg-card p-6 md:p-7">
              <h2 className="mb-5 font-semibold">{t.payment_section}</h2>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="grid gap-3">
                {(
                  [
                    { value: 'cod', Icon: Banknote, title: t.cod, desc: t.cod_desc },
                    { value: 'card', Icon: CreditCard, title: t.card, desc: t.card_desc },
                  ] as const
                ).map(({ value, Icon, title, desc }) => (
                  <Label
                    key={value}
                    htmlFor={`pay-${value}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all',
                      payment === value && 'border-foreground ring-1 ring-foreground'
                    )}
                  >
                    <RadioGroupItem value={value} id={`pay-${value}`} className="mt-0.5" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="size-4" />
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>

              {payment === 'card' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 grid gap-4 overflow-hidden rounded-2xl bg-secondary/50 p-4 sm:grid-cols-2"
                >
                  <div className="sm:col-span-2">
                    <Label htmlFor="cardNumber">{t.card_number}</Label>
                    <Input
                      id="cardNumber"
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      className="mt-1.5"
                      maxLength={19}
                      {...register('cardNumber')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardExpiry">{t.card_expiry}</Label>
                    <Input id="cardExpiry" placeholder="12/28" maxLength={5} className="mt-1.5" {...register('cardExpiry')} />
                  </div>
                  <div>
                    <Label htmlFor="cardCvc">{t.card_cvc}</Label>
                    <Input id="cardCvc" inputMode="numeric" placeholder="123" maxLength={4} className="mt-1.5" {...register('cardCvc')} />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">{t.card_desc}</p>
                </motion.div>
              )}
            </section>
          </div>

          {/* summary column */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-3xl border bg-card p-6">
              <h2 className="font-semibold">{t.order_summary}</h2>
              <Separator />

              {/* mini items */}
              <div className="thin-scrollbar max-h-64 space-y-4 overflow-y-auto pe-1">
                {lines.map((line) => (
                  <div key={line.key} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border">
                      <Image src={line.image} alt={line.name} fill sizes="56px" className="object-cover" />
                      <span className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {line.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{line.name}</p>
                      {Object.entries(line.options).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(line.options)
                            .map(([, v]) => v)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatPrice(line.price * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.shipping_label}</span>
                  <span className="font-medium tabular-nums">
                    {shippingCost === 0 ? <span className="text-emerald-600">{t.free}</span> : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.tax_label}</span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(serverTotals?.tax ?? 0)}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.total}</span>
                <span className="text-2xl font-bold tabular-nums">{formatPrice(total)}</span>
              </div>

              <Button type="submit" size="lg" disabled={placing} className="h-12 w-full rounded-full font-semibold">
                {placing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t.placing_order}
                  </>
                ) : (
                  <>
                    {t.place_order}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </>
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-emerald-600" />
                {t.prop_secure_desc}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

/** Small wrapper so Select works smoothly with RHF without register */
function ControllerWrapper({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 w-full" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
