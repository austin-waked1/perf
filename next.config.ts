import type { NextConfig } from "next";

// Allow next/image to optimize product/category media served by the live
// WordPress backend (hostname derived from NEXT_PUBLIC_WORDPRESS_URL).
function wordpressImageHosts() {
  const raw = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  if (!raw) return [];
  try {
    return [{ protocol: "https" as const, hostname: new URL(raw).hostname, pathname: "/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: wordpressImageHosts(),
    // Remote WP images bypass the optimizer (see src/lib/image-loader.ts).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
