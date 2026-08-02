# TanFaster

[NextFaster](https://github.com/ethanniser/NextFaster) ported to
**TanStack Start + Deno**, deployed to **Railway** and **Deno Deploy**,
benchmarked against the Vercel-hosted original.

**Live:**
- Railway: https://web-production-b437.up.railway.app
- Deno Deploy: https://tanfaster-app.exemplary-citizen.deno.net
- Original: https://next-faster.vercel.app

The question this repo answers: can a client-first TanStack Start app on Deno
match or beat NextFaster's performance (PPR + ISR + RSC on Vercel's edge)?

**TL;DR: yes on interactivity, bundle size, soft navigation, and US edge
latency — the port outright beats the original on several axes. Vercel keeps
two structural advantages: globally-warm edge cache (~100 PoPs) and PPR's
streamed-shell first paint.**

## Results (2026-08-01)

All raw data in `bench/out/`. Same 1M-product corpus on all three sites.

### Lighthouse (mobile, local Chrome, median of 3, idle machine)

| site | page | score | LCP ms | FCP ms | TBT ms | CLS |
|---|---|---:|---:|---:|---:|---:|
| Vercel original | home | 89 | 3320 | **1362** | 78 | 0 |
| **TanFaster Railway** | home | **94** | **2784** | 2073 | **10** | 0 |
| TanFaster Deno Deploy | home | 90 | 3225 | 2367 | 39 | 0 |
| Vercel original | product | **96** | **2643** | **999** | 90 | 0 |
| TanFaster Railway | product | 91 | 3166 | 2263 | **4** | 0 |
| TanFaster Deno Deploy | product | 72¹ | 4989 | 4059 | 6 | 0.002 |

¹ high variance (96/2010ms LCP on one run): Deno Deploy serves from a single
US region (ORD), so throttled-mobile runs amplify its ~60ms TTFB and isolate
warmth.

### Client-side navigation (hover-preloaded click → content, real browser, median)

| | Vercel | Railway | Deno Deploy |
|---|---:|---:|---:|
| soft-nav | 25ms | **16ms** | 64ms |

### Warm TTFB — same-region (SF Bay Area client)

| page | Vercel | Railway | Deno Deploy |
|---|---:|---:|---:|
| home | 98ms | **7ms** | 59ms |
| product | 20ms | **6ms** | 61ms |
| search API | 14ms | **7ms** | 60ms |

### Warm TTFB — global (globalping probes, home page, median)

| region | Vercel | Railway | Deno Deploy |
|---|---:|---:|---:|
| Seattle | 35 | **26** | 1557² |
| São Paulo | **21** | 248 | 409 |
| Frankfurt | **69** | 212 | 265 |
| Singapore | **30** | 301 | 207 |
| Sydney | **33** | 351 | 199 |

² cold-isolate outlier. The honest story: Vercel's edge is warm in every
region; Railway's CDN (beta) currently caches at US PoPs only (`x-cache:
DYNAMIC` observed abroad); Deno Deploy serves everything from its US region.

### Payload

| metric | Vercel | TanFaster |
|---|---:|---:|
| initial JS (gzip, home) | ~224 KB | **157 KB** (−30%) |
| home HTML (wire) | 75 KB | 70 KB (Railway) |
| product HTML (wire) | **19 KB** | 45 KB (markup + serialized loader data) |

### Verdict vs the plan's success criteria

| criterion | result |
|---|---|
| warm TTFB ≤ original+10%, ≥4/5 regions | ✅ US · ❌ globally (CDN coverage, not app speed) |
| lab LCP ≤ original+100ms | ✅ home (−536ms) · ❌ product (+523ms) |
| TBT ≤ original+50ms | ✅✅ 4–39ms vs 78–90ms |
| CLS ≤ 0.02 | ✅ |
| soft-nav ≤ original+10% | ✅ −36% |
| initial JS ≤ original+20% | ✅ −30% |

What can't be replicated without framework support: **PPR's streamed static
shell** (their FCP advantage — our monolithic SSR HTML must fully arrive
before paint) and **Vercel's always-warm ~100-PoP edge**. A TanStack
`Await`-based deferred-loader shell would close most of the FCP gap and is
the natural next experiment.

Running cost: ~$40/mo (Railway web + imgproxy + Postgres, Deno Deploy free
tier) vs the original's documented ~$513/1M page views.

## Architecture

- **Framework**: TanStack Start 1.168.34 (pinned; router 1.170.18), streaming
  SSR, no RSC; React Compiler off; Tailwind v4; CSS inlined at SSR
  (`?inline` + route `styles`) — the `experimental.inlineCss` equivalent
- **ISR substitute**: CDN-cached SSR HTML (`s-maxage` + `stale-while-revalidate`);
  per-entity `Deno-Cache-Tag` + `/api/revalidate` purge on Deno Deploy
  (verified `revalidateTag` equivalent); Railway CDN Auto mode with
  purge-on-deploy off
- **Guard rail**: request middleware throws (dev) / sanitizes (prod) if any
  cacheable route emits `Set-Cookie` — one stray cookie disables both CDNs
- **Data**: Railway Postgres, NextFaster's published 1M-row dump, same GIN
  full-text + trigram indexes; postgres.js (`prepare:false`);
  `cached()` = AsyncLocalStorage request-dedupe + in-memory TTL + tags
- **Prefetching**: custom Link — viewport dwell 300ms → `router.preloadRoute`
  + image warming from typed loader data (replaces the original's
  HTML-scraping `/api/prefetch-images`), hover re-warm, mousedown navigation
- **Cart**: non-httpOnly JSON cookie read synchronously by the badge
  (`useSyncExternalStore` on `document.cookie`) — zero network, zero CLS,
  keeps SSR HTML user-agnostic
- **Auth**: jose HS256 JWT + bcryptjs; fixed-window rate limiting in Postgres
  (replaces Upstash/Vercel KV)
- **Images**: imgproxy on Railway behind Railway CDN (48px@2x WebP q65 thumbs,
  256px@2x q80 hero) over the original's public blob store
- **OG images**: satori + resvg-wasm server route (works on Deno Deploy
  isolates; wasm + font fetched once per isolate, static PNG fallback)
- **Deno Deploy specifics**: framework auto-detection failed for this stack —
  the working config is explicit `deno install --allow-scripts` +
  `NITRO_PRESET=deno_server deno task build` + dynamic entrypoint
  `.output/server/index.mjs`, plus `scripts/patch-builtins.ts` (postgres.js
  imports bare Node builtins; isolates require `node:` prefixes)

## Development

```sh
deno install --allow-scripts
cp .env.example .env      # DATABASE_URL, AUTH_SECRET, REVALIDATE_SECRET
deno task dev
deno task build && deno task start
deno task test && deno task typecheck
scripts/restore-db.sh     # 1M-product restore (DATABASE_PUBLIC_URL=...)
```

Benchmarks: `bench/` — `cold-warm.ts`, `ttfb.ts` (globalping),
`lighthouse-local.sh`, `softnav-snippet.js`, `report.ts`.

## License

MIT. Ported from [NextFaster](https://github.com/ethanniser/NextFaster)
(MIT, © 2024 Ethan Niser and contributors) — see LICENSE.
