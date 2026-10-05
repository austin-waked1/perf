'use client';

// SSR-safe "mounted" flag. Uses useSyncExternalStore so the first client
// render after hydration flips it without setState-in-effect (lint-safe).

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
