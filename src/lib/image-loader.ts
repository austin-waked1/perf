import type { ImageLoaderProps } from "next/image";

/**
 * Custom next/image loader — serve ALL images as-is.
 *
 * Remote images (WordPress uploads on altaha.shop) are handed to the browser
 * AS-IS instead of being proxied through the /_next/image optimizer: the
 * optimizer does a single upstream fetch per miss, and this host drops a
 * large share of fresh TCP connections to altaha.shop (flaky IPv4, dead
 * IPv6) — those failures surface as permanent 500s and gray boxes because
 * <img> never retries. Browsers handle flaky connections far more gracefully
 * (happy-eyeballs + socket retries), so direct loading is the reliable path.
 *
 * The /_next/image endpoint is additionally unavailable in this setup
 * (custom loader + Turbopack dev 404s every local request — verified via
 * curl), so local assets (the product placeholder) are served directly from
 * /public as well. Store product imagery lives on WP; local files are few
 * and already web-sized, so optimizer resizing is not needed.
 */
export default function imageLoader({ src }: ImageLoaderProps): string {
  return src;
}
