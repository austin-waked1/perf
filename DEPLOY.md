# FORMA Store — Deployment Guide

This guide walks you through deploying the FORMA storefront to **Vercel** or **Render**. The store is a **pure frontend** — it has no database, no API routes, no server-side persistence. Every read/write (catalog, cart, checkout) goes straight to your live WordPress + WooCommerce backend at `https://altaha.shop/graphql`.

Stack:

- **Next.js 16** (standalone output, static + dynamic routes)
- **Bun** as the package manager (both Vercel and Render auto-detect `bun.lock`)
- **WPGraphQL / WooGraphQL** as the data source

---

## 0. What you need first

| Thing | Where | Notes |
|-------|-------|-------|
| The project as a **GitHub repo** | github.com | Push this folder to a fresh repo. Render & Vercel both deploy from GitHub. |
| Your **WordPress + WooCommerce** at `https://altaha.shop` | already configured | The store talks to it via WPGraphQL. |
| (Optional) A **payment gateway** in WooCommerce admin | Woo admin | COD is enabled by default; switch with `NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD`. |

That's it. No Postgres, no Neon, no Supabase. No DB to provision.

---

## 1. Local smoke test (recommended before pushing)

```bash
# 1. Copy .env.example → .env
cp .env.example .env
# (It's already filled with your WP URL — no edits needed.)

# 2. Install deps
bun install

# 3. Start the dev server
bun run dev
# → open http://localhost:3000
```

If the home page renders with the live altaha.shop products (Nr 7 V, ALTAHA YOO, INTENSELY…), you're good to push.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "forma store — frontend-only, ready to deploy"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> **Important:** `.env` is gitignored (only `.env.example` is committed). You'll set the env vars in the Vercel/Render dashboard.

---

## 3a. Deploy to Vercel (recommended path)

1. Sign up at https://vercel.com (free).
2. **Add New → Project → Import** your GitHub repo.
3. Vercel auto-detects Next.js — keep the defaults.
4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_WORDPRESS_URL` | `https://altaha.shop/graphql` |
   | `NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD` | `cod` (or `paypal`, `stripe` …) |

5. Click **Deploy**. Vercel runs `bun install` → `bun run build` and goes live.
6. Click **Visit**. You should see the FORMA storefront pulling live data from altaha.shop.

That's the whole deploy. No DB setup, no migrations, no nothing.

---

## 3b. Deploy to Render (alternative path)

### Option A — use the Blueprint (recommended)

1. Sign up at https://render.com.
2. **New → Blueprint** → pick your GitHub repo.
3. Render reads `render.yaml` and provisions a single **Web Service** (`forma-store`, free tier, Frankfurt).
4. Review the env vars (they're pre-filled from `render.yaml`). Adjust as needed.
5. Click **Apply**. Render installs deps, runs `bun run build`, then `bun run start`.
6. Once live, click the URL at the top of the service page.

### Option B — manual setup

1. **New + → Web Service** → connect your GitHub repo.
   - **Runtime:** Node
   - **Build Command:** `bun install && bun run build`
   - **Start Command:** `bun run start`
   - **Plan:** Free (or Starter for always-on)
2. **Environment** tab → add:
   - `NEXT_PUBLIC_WORDPRESS_URL` → `https://altaha.shop/graphql`
   - `NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD` → `cod`
3. **Manual Deploy → Deploy**.

---

## 4. Verify the live deployment

Open the URL. Check:

- Home page shows the live altaha.shop catalog (Nr 7 V, ALTAHA YOO 1–5, INTENSELY, ALTAHA VIP…).
- Hero coverflow (5 featured slides) cycles correctly.
- Click a product → PDP opens with gallery, price, size chips (10/30/50/100 ml), Add to cart.
- Cart drawer opens with the line item + free-shipping progress bar.
- Toggle the language (top-right) → Arabic RTL mirrors everything.
- Toggle theme (sun/moon icon) → light/dark.
- Complete checkout with COD → order lands in WooCommerce → Orders.

If any of these break, check the platform's logs (Vercel: project → Logs; Render: service → Logs).

---

## 5. Common gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| Home page shows **empty** products | `NEXT_PUBLIC_WORDPRESS_URL` not set, or WPGraphQL unreachable from the browser | Set it to `https://altaha.shop/graphql`. Confirm CORS is open on the WP side (it is for altaha.shop). |
| Product images broken | `next.config.ts` `remotePatterns` only includes the WP host | Confirm `NEXT_PUBLIC_WORDPRESS_URL` matches the host your images come from (altaha.shop). The build reads it at compile time. |
| Checkout errors with "invalid payment method" | The selected gateway isn't enabled in WooCommerce admin | Enable it in Woo → Settings → Payments, or switch `NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD` to one that is (`cod` is the safest default). |
| Build fails on Render with `bun: not found` | Render's Node image doesn't have Bun | Switch the runtime to "Docker" with the `oven/bun:latest` image, OR add `npm i -g bun` as a pre-build step. The Blueprint handles this for you. |
| `next/image` 504 / "image optimization failed" on Vercel | Custom image loader already bypasses this — but if you've customized `next.config.ts`, double-check the loader is still set to `"custom"` | Keep `images.loader: "custom"` and `loaderFile: "./src/lib/image-loader.ts"` — the storefront uses the WP image URLs directly without Vercel's optimizer. |

---

## 6. Project structure (for reference)

```
.
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/store/   # HeroShowcase, Header, Footer, ProductCard, views…
│   ├── hooks/              # useProducts / useProduct / useCategories (TanStack Query)
│   ├── lib/
│   │   ├── commerce.ts     # Direct WPGraphQL reads/writes (no fallback)
│   │   ├── graphql/        # WPGraphQL client + queries + normalizer
│   │   ├── store/          # zustand cart store
│   │   ├── i18n.ts         # EN/AR dictionaries
│   │   └── types.ts
│   └── instrumentation.ts
├── public/
│   └── images/             # hero placeholder, category placeholder, etc.
├── next.config.ts          # standalone output, WP image host in remotePatterns, custom image loader
├── vercel.json             # Vercel config (framework: nextjs)
├── render.yaml            # Render Blueprint (web service only — no DB)
├── .env.example            # 2 env vars (WP URL + payment method)
├── package.json           # build / start scripts (no DB scripts)
└── DEPLOY.md              # this file
```

---

## 7. After-deploy tips

- **Custom domain:** Both Vercel and Render let you point a domain at the service. Put it behind Cloudflare for free CDN + caching.
- **Image optimization:** `next/image` is configured with `loader: "custom"` so WP images bypass the Next.js optimizer (saves bandwidth + avoids caching issues). Switch to default by removing `images.loader` in `next.config.ts` if you want Vercel/Render to optimize.
- **Payments:** Configure gateways in WooCommerce → Settings → Payments. Then set `NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_METHOD` to match.
- **Orders:** All orders go straight to WooCommerce (visible in Woo admin → Orders). The store has no local persistence — the cart is the Woo session cart, hydrated from `localStorage` line items on every page load.
