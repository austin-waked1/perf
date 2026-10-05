import type { Metadata, Viewport } from "next";
import { Onest, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AdaptiveGrid } from "@/components/store/adaptive-grid";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "FORMA — Modern Essentials Store",
  description:
    "Headless WooCommerce-style storefront built with Next.js. Considered wardrobe foundations, accessories and objects for the home — made from natural materials.",
  keywords: ["e-commerce", "headless wordpress", "woocommerce", "next.js", "store", "shop"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${onest.variable} ${geistMono.variable} ${notoArabic.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <AdaptiveGrid />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
