'use client';

// Lumora adaptive grid — scale the root font-size UP beyond the 1920px base
// width so the rem-based layout keeps growing on large displays (mirrors the
// reference implementation). Below 1920px the CSS media queries drive sizing.

import { useEffect } from 'react';

const FONT_BASE = 16;
const BASE_WIDTH = 1920;
const COEF = 0.6666;

export function AdaptiveGrid() {
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w <= BASE_WIDTH) {
        document.documentElement.style.removeProperty('font-size');
        return;
      }
      const widthReduction = ((BASE_WIDTH - w) / BASE_WIDTH) * 100; // negative above base
      const size = FONT_BASE - (FONT_BASE * (widthReduction * COEF)) / 100;
      if (size > FONT_BASE) document.documentElement.style.fontSize = `${size}px`;
      else document.documentElement.style.removeProperty('font-size');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  return null;
}
