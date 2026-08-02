# TanFaster

[NextFaster](https://github.com/ethanniser/NextFaster) ported to
**TanStack Start + Deno**, deployed to **Deno Deploy** (primary) and
**Railway** (secondary), benchmarked against the Vercel-hosted original.

The question this repo answers: can a client-first TanStack Start app on Deno
match or beat NextFaster's performance (PPR + ISR + RSC on Vercel's edge)?

## Architecture

- **Framework**: TanStack Start (pinned), streaming SSR, no RSC
- **ISR substitute**: CDN-cacheable SSR HTML (`s-maxage` + `stale-while-revalidate`)
  with `Deno-Cache-Tag` per entity + purge API on Deno Deploy
- **DB**: Railway Postgres, 1M+ products from NextFaster's published dump,
  same schema/indexes (GIN full-text + trigram)
- **Images**: imgproxy on Railway behind Railway CDN
- **Guard rail**: request middleware fails the build/dev loudly if any
  cacheable route ever emits `Set-Cookie` (which would silently disable CDN caching)

## Development

```sh
deno install --allow-scripts
deno task dev        # vite dev server
deno task build      # production build (nitro)
deno task start      # run the built server
deno task test       # vitest
deno task typecheck
```

## Benchmarks

See `bench/` (Phase 6). Results will be published here.

## License

MIT. Portions ported from [NextFaster](https://github.com/ethanniser/NextFaster)
(MIT, © 2024 Ethan Niser and contributors) — see LICENSE.
