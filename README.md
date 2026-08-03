# TanFaster

[NextFaster](https://github.com/ethanniser/NextFaster) ported to
**TanStack Start + Deno**, deployed on **Railway**, benchmarked against the
Vercel-hosted original.

**Live:**
- TanFaster: https://web-production-b437.up.railway.app
- Original: https://next-faster.vercel.app

The question this repo answers: can a client-first TanStack Start app on Deno
match or beat NextFaster's performance (PPR + ISR + RSC on Vercel's edge)?

**TL;DR: for US users, yes — the port beats the original on interactivity,
bundle size, soft navigation, warm TTFB, and home-page Lighthouse. Vercel
keeps two structural advantages: a globally-warm ~100-PoP edge cache and
PPR's streamed-shell first paint (their FCP/product-LCP win).**

## Results (2026-08-01/02)

Raw data in `bench/out/`. Same 1M-product corpus on both sites.

### Lighthouse (mobile, local Chrome, median of 3, idle machine)

| site | page | score | LCP ms | FCP ms | TBT ms | CLS |
|---|---|---:|---:|---:|---:|---:|
| Vercel original | home | 89 | 3320 | **1362** | 78 | 0 |
| **TanFaster** | home | **94** | **2784** | 2073 | **10** | 0 |
| Vercel original | product | **96** | 2643 | **999** | 90 | 0 |
| TanFaster | product | 91 | 3166 | 2263 | **4** | 0 |
| TanFaster (streamed shell)¹ | product | 95 | **2405** | 2292 | **10** | 0 |

¹ after deferring the related-products grid behind `defer()`/`Await`
(streaming SSR flushes the shell at ~TTFB — the PPR-shell equivalent). In the
paired same-session control, Vercel scored 95 with LCP 2792ms: **a tie on
score and a ~390ms LCP win**. FCP remains Vercel's — their first streamed
chunk is tiny, ours carries the full inline CSS.

**Deferred-shell rollout + sidebar payload diet** (all grid pages stream;
the layout's sidebar loads 19 name+slug rows instead of the full ~100KB
nested collections tree, which used to sit *before* visible content on every
page). Final paired round: **home 95 vs 90 (LCP 2405 vs 3129)**, product
95 vs 98 (LCP 2440 vs 2209) — run-to-run LCP noise now swings the product
comparison both ways. Product page wire weight: **45KB → 14.8KB gz**,
smaller than the original's 19KB. Subcategory HTML: 217KB → 79KB raw, first
visible content moved from byte ~154K to ~40K.

### Client-side navigation (hover-preloaded click → content, real browser, median)

| | Vercel | TanFaster |
|---|---:|---:|
| soft-nav | 25ms | **16ms** |

### Warm TTFB

| | Vercel | TanFaster |
|---|---:|---:|
| same-region (SF), all pages | 14–98ms | **6–9ms** |
| origin render, uncached page | n/a (ISR store) | 65–180ms |
| global (globalping, home) | **21–69ms everywhere** | 26ms Seattle · 212–351ms abroad¹ |

¹ Railway's CDN (beta) currently caches at US PoPs only (`x-cache: DYNAMIC`
observed abroad), so international requests pay a full origin round trip.
This is CDN coverage, not app speed — the app renders in well under 200ms.

### Payload

| metric | Vercel | TanFaster |
|---|---:|---:|
| initial JS (gzip, home) | ~224 KB | **157 KB** (−30%) |
| home HTML (wire) | 75 KB | **70 KB** |
| product HTML (wire) | **19 KB** | 45 KB (markup + serialized loader data) |

### Verdict vs the plan's success criteria

| criterion | result |
|---|---|
| warm TTFB ≤ original+10%, ≥4/5 regions | ✅ US · ❌ globally (Railway CDN's PoP coverage) |
| lab LCP ≤ original+100ms | ✅ home (−536ms) · ✅ product after streamed shell (−387ms vs paired control) |
| TBT ≤ original+50ms | ✅✅ 4–10ms vs 78–90ms |
| CLS ≤ 0.02 | ✅ |
| soft-nav ≤ original+10% | ✅ −36% |
| initial JS ≤ original+20% | ✅ −30% |

The streamed-shell experiment (product page) shows TanStack's
`defer()`/`Await` recovers most of PPR's benefit: the shell flushes at ~TTFB
and Railway's CDN passes chunks through even on cold requests (verified:
shell ~80ms, grid +30ms on uncached pages). What remains structurally
Vercel's: the **FCP head start** (their first chunk is a few KB of head;
ours carries the inlined CSS) and the **always-warm global edge**. Rolling
the deferred shell out to the category/subcategory grids is the remaining
easy win.

Running cost: ~$20–25/mo (Railway web + imgproxy + Postgres) vs the
original's documented ~$513/1M page views.

### The Deno Deploy experiment (retired)

We also ran the same app on Deno Deploy (GA platform). Findings before
retiring it:

- Its CDN's **tag-based purge** (`Deno-Cache-Tag` + invalidation API) is the
  best `revalidateTag` substitute on any host we tested, and cache-hit TTFB
  was a solid ~60ms.
- But compute runs in one US region (ORD), and the serverless-isolate model
  plus a cross-provider TCP Postgres connection made **uncached page renders
  0.4–1.5s** (connection handshakes ~4×RTT before the first query, per-isolate
  caches always cold). With a 1M-page long-tail catalog and no organic
  traffic, most requests are misses, so dashboard p50 sat at 3–5s.
- The fix would be a co-located HTTP-driver database (e.g. Neon +
  `drizzle-orm/neon-http` — what the original uses, for exactly this reason).
  We retired the deployment instead; an always-on container next to its DB
  (Railway) suits this workload better. Framework note: Deno Deploy's
  TanStack Start auto-detection failed for this stack — the working config
  was explicit `deno install --allow-scripts` +
  `NITRO_PRESET=deno_server deno task build` + entrypoint
  `.output/server/index.mjs`, plus `scripts/patch-builtins.ts` to
  `node:`-prefix postgres.js's bare builtin imports.

## Architecture

- **Framework**: TanStack Start 1.168.34 (pinned; router 1.170.18), streaming
  SSR, no RSC; Tailwind v4; CSS inlined at SSR (`?inline` + route `styles`)
  — the `experimental.inlineCss` equivalent
- **ISR substitute**: CDN-cached SSR HTML (`s-maxage` +
  `stale-while-revalidate`) on Railway CDN (Auto mode, purge-on-deploy off)
- **Guard rail**: request middleware throws (dev) / sanitizes (prod) if any
  cacheable route emits `Set-Cookie` — one stray cookie disables CDN caching
- **Data**: Railway Postgres over private networking, NextFaster's published
  1M-row dump, same GIN full-text + trigram indexes; postgres.js
  (`prepare:false`); `cached()` = AsyncLocalStorage request-dedupe +
  in-memory TTL + tags
- **Prefetching**: custom Link — viewport dwell 300ms → `router.preloadRoute`
  + image warming from typed loader data (replaces the original's
  HTML-scraping `/api/prefetch-images`), hover re-warm, mousedown navigation
- **Cart**: non-httpOnly JSON cookie read synchronously by the badge
  (`useSyncExternalStore` on `document.cookie`) — zero network, zero CLS,
  keeps SSR HTML user-agnostic
- **Auth**: jose HS256 JWT + bcryptjs; fixed-window rate limiting in Postgres
  (replaces Upstash/Vercel KV)
- **Images**: same-origin `/img/<w>/<q>/<path>` route → imgproxy (Railway
  private network) → original public blob store; 48px@2x WebP q65 thumbs,
  256px@2x q80 hero; immutable 1-year caching on the site's own CDN entry.
  `scripts/warm-images.ts` pre-warms the category/subcategory grid variants
- **OG images**: satori + resvg-wasm server route with static PNG fallback
- **Streamed shell**: product page defers the related-products grid
  (`defer()` + `<Await>`) so streaming SSR flushes head + above-fold content
  at ~TTFB; bots get fully-buffered HTML (the stream handler's `isbot` path),
  and the CDN stores the complete document, so warm hits are unaffected

## Development

```sh
deno install --allow-scripts
cp .env.example .env      # DATABASE_URL, AUTH_SECRET, REVALIDATE_SECRET, IMGPROXY_ORIGIN
deno task dev
deno task build && deno task start
deno task test && deno task typecheck
scripts/restore-db.sh     # 1M-product restore (DATABASE_PUBLIC_URL=...)
deno run -A scripts/warm-images.ts https://your-domain   # warm grid images
```

Benchmarks: `bench/` — `cold-warm.ts`, `ttfb.ts` (globalping),
`lighthouse-local.sh`, `softnav-snippet.js`, `report.ts`.

## License

MIT. Ported from [NextFaster](https://github.com/ethanniser/NextFaster)
(MIT, © 2024 Ethan Niser and contributors) — see LICENSE.
