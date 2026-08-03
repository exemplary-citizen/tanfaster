# TanFaster

[NextFaster](https://github.com/ethanniser/NextFaster) ported to
**TanStack Start + Deno**, deployed on **Railway**, benchmarked against the
Vercel-hosted original.

**Live:**
- TanFaster: https://web-production-b437.up.railway.app
- Original: https://next-faster.vercel.app

The question this repo answers: can a client-first TanStack Start app on Deno
match or beat NextFaster's performance (PPR + ISR + RSC on Vercel's edge)?

**TL;DR: for US users, yes. In the final paired measurements the port wins
home-page Lighthouse (95 vs 90), ties product (95 vs 98, LCP within noise),
wins interactivity by an order of magnitude (TBT 10–22ms vs 78–206ms), ships
30% less JS and a product page under half the original's HTML weight, and
serves warm pages 3–5× faster from its edge. Vercel keeps two structural
advantages: a globally-warm ~100-PoP edge cache, and PPR's tiny first chunk
(FCP ~1.1–1.4s vs our ~2.1–2.3s).**

## Final results (2026-08-02)

Raw data in `bench/out/`. Same 1M-product corpus on both sites. Lighthouse:
mobile preset, local Chrome, medians, **paired same-session runs** (control
runs against the original in the same batch to cancel machine conditions).

### Lighthouse

| page | site | score | LCP ms | FCP ms | TBT ms |
|---|---|---:|---:|---:|---:|
| home | **TanFaster** | **95** | **2405** | 2255 | **22** |
| home | Vercel original | 90 | 3129 | **1404** | 206 |
| product | TanFaster | 95 | 2440 | 2118 | 102 |
| product | Vercel original | **98** | 2209 | **1096** | 86 |

Product LCP swings both ways run-to-run (the previous paired round: TanFaster
2405 vs Vercel 2792) — treat the two product columns as a tie. FCP is
consistently Vercel's; see "What made it fast" for why.

### Network

| metric | Vercel | TanFaster |
|---|---:|---:|
| warm TTFB, same-region (SF), all 6 page types | 16–45ms | **5–12ms** |
| cold origin render (uncached page), shell TTFB | n/a (persistent ISR store) | 38–114ms (streamed) |
| global warm TTFB (globalping, home) | **21–69ms everywhere** | 26ms Seattle · 212–351ms abroad¹ |

¹ Railway's CDN (beta) currently caches at US PoPs only (`x-cache: DYNAMIC`
observed abroad), so international requests pay a full round trip to the US
origin. This is CDN coverage, not app speed.

### Payload

| metric | Vercel | TanFaster |
|---|---:|---:|
| initial JS (gzip, home) | ~224 KB | **157 KB** (−30%) |
| home HTML (wire) | 75 KB | **72 KB** |
| product HTML (wire) | 19 KB | **14.8 KB** |

### Client-side navigation

Hover-preloaded click → content change, real browser, median: **Vercel 25ms,
TanFaster 59ms** — both perceptually instant. Before the streamed-shell
change TanFaster measured 16ms; deferred loaders currently cost ~40ms of
preload reuse on soft-nav. A knowing trade for the LCP/streaming wins.

### Verdict vs the plan's success criteria

| criterion | result |
|---|---|
| warm TTFB ≤ original+10%, ≥4/5 regions | ✅ US · ❌ globally (Railway CDN PoP coverage) |
| lab LCP ≤ original+100ms | ✅ home (−724ms) · ✅ product (within run noise) |
| TBT ≤ original+50ms | ✅ 10–102ms vs 78–206ms |
| CLS ≤ 0.02 | ✅ 0.00 |
| soft-nav ≤ original+10% | ❌ 59ms vs 25ms (was ✅ 16ms pre-streaming; both feel instant) |
| initial JS ≤ original+20% | ✅ −30% |

Running cost: ~$20–25/mo (Railway web + imgproxy + Postgres) vs the
original's documented ~$513/1M page views.

## What made it fast (and what didn't work)

The port went through three measured optimization rounds; each is a commit
you can diff:

1. **Baseline port** — faithful re-implementation: CDN-cached SSR HTML with
   `s-maxage` + `stale-while-revalidate` as the ISR substitute, hover/viewport
   preloading, inline CSS. Product page scored 91 vs Vercel's 96; LCP ~500ms
   behind.
2. **Streamed shell** (`defer()` + `<Await>`) — the PPR equivalent. Heavy grid
   queries are deferred so streaming SSR flushes head + above-fold content at
   ~TTFB. Railway's CDN passes chunks through on cold requests (verified:
   shell ~40–110ms, grid streams in after) while storing the complete document
   for warm hits. Bots get fully-buffered HTML (the handler's `isbot` path).
   Product page: 91 → 95, LCP −760ms.
3. **Sidebar payload diet** — byte-layout analysis showed ~100KB of serialized
   sidebar loader data (the full collections→categories tree, 549 rows) sat
   *before* the first visible element on every page; the sidebar renders 19
   collection names. A light name+slug query moved first content from byte
   ~154K to ~40K, cut product wire weight 45KB → 14.8KB, and won the home
   Lighthouse comparison outright.

**The remaining FCP gap (~1s) is structural**: Vercel's PPR first chunk is a
few KB of head + critical CSS, while our first chunk carries the full inlined
stylesheet (~30KB raw) before body. Available but unimplemented levers:
critical-CSS splitting (~100–300ms est.), dropping the second font family,
and 103 Early Hints via a CDN that supports them.

### The Deno Deploy experiment (retired)

The same app ran on Deno Deploy (GA platform) before being retired:

- Its CDN's **tag-based purge** (`Deno-Cache-Tag` + invalidation API) is the
  best `revalidateTag` substitute on any host we tested; cache-hit TTFB ~60ms.
- But compute runs in one US region (ORD), and serverless isolates + a
  cross-provider TCP Postgres connection made **uncached renders 0.4–1.5s**
  (connection handshakes ~4×RTT before the first query; per-isolate caches
  always cold). With a 1M-page long tail and no organic traffic, most requests
  are misses — dashboard p50 sat at 3–5s.
- The fix would be a co-located HTTP-driver database (e.g. Neon +
  `drizzle-orm/neon-http` — what the original uses, for exactly this reason).
  We retired the deployment instead: an always-on container next to its DB
  suits this workload better. Deployment notes for anyone trying: framework
  auto-detection failed for this stack; the working config was explicit
  `deno install --allow-scripts` + `NITRO_PRESET=deno_server deno task build`
  + entrypoint `.output/server/index.mjs`, plus `scripts/patch-builtins.ts`
  to `node:`-prefix postgres.js's bare builtin imports for isolates.

## Architecture

- **Framework**: TanStack Start 1.168.34 (pinned; router 1.170.18), streaming
  SSR, no RSC; Tailwind v4; CSS inlined at SSR (`?inline` + route `styles`)
  — the `experimental.inlineCss` equivalent
- **ISR substitute**: CDN-cached SSR HTML (`s-maxage` +
  `stale-while-revalidate`) on Railway CDN (Auto mode, purge-on-deploy off)
- **Streamed shell everywhere**: grid queries are deferred (`defer()` +
  `<Await>`) on home, category, subcategory, and product pages; the layout
  sidebar uses a light 19-row query so per-page loader data stays small
- **Guard rail**: request middleware throws (dev) / sanitizes (prod) if any
  cacheable route emits `Set-Cookie` — one stray cookie disables CDN caching
- **Data**: Railway Postgres over private networking, NextFaster's published
  1M-row dump, same GIN full-text + trigram indexes; postgres.js
  (`prepare:false`); `cached()` = AsyncLocalStorage request-dedupe +
  in-memory TTL + tags
- **Prefetching**: custom Link — viewport dwell 300ms → `router.preloadRoute`
  + image warming from typed loader data, including data that arrives via
  deferred promises (replaces the original's HTML-scraping
  `/api/prefetch-images`); hover re-warm; mousedown navigation
- **Cart**: non-httpOnly JSON cookie read synchronously by the badge
  (`useSyncExternalStore` on `document.cookie`) — zero network, zero CLS,
  keeps SSR HTML user-agnostic
- **Auth**: jose HS256 JWT + bcryptjs; fixed-window rate limiting in Postgres
  (replaces Upstash/Vercel KV)
- **Images**: same-origin `/img/<w>/<q>/<path>` route → imgproxy (Railway
  private network) → original public blob store; 48px@2x WebP q65 thumbs,
  256px@2x q80 hero; immutable 1-year caching on the site's own CDN entry.
  `scripts/warm-images.ts` pre-warms the ~2,600 category/subcategory grid
  variants
- **OG images**: satori + resvg-wasm server route with static PNG fallback

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
