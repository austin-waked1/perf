'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-2 px-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div dir="ltr" className="lg:grid lg:grid-cols-2" aria-hidden>
      {/* gallery stack */}
      <div className="flex flex-col gap-2 lg:gap-3 lg:pb-3 lg:pt-3">
        <Skeleton className="h-[72svh] w-full rounded-2xl lg:h-[calc(100svh-5.25rem)] lg:rounded-3xl" />
        <Skeleton className="h-[40svh] w-full rounded-2xl lg:h-[calc(100svh-5.25rem)] lg:rounded-3xl" />
      </div>
      {/* fixed-size info card, centered in the right half */}
      <div className="max-lg:px-4 max-lg:py-8 lg:flex lg:items-center lg:justify-center lg:px-6 xl:px-10">
        <div className="w-full space-y-5 lg:w-[26rem] lg:rounded-3xl lg:border lg:bg-muted/60 lg:p-8 xl:w-[28rem]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-12 w-3/4 lg:h-16" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
          <Skeleton className="h-10 w-48 rounded-full" />
          <Skeleton className="h-10 w-56 rounded-full" />
          <div className="flex gap-3">
            <Skeleton className="h-14 w-40 rounded-full" />
            <Skeleton className="h-14 flex-1 rounded-full" />
            <Skeleton className="size-14 rounded-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-full bg-foreground/80" />
          <div className="space-y-2.5">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
