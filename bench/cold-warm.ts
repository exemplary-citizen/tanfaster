// Cold vs warm TTFB from this machine. Purge control:
// - our sites: Deno Deploy via /api/revalidate tags; Railway via `railway cdn purge html` (run manually before --cold)
// - Vercel original: no purge control; cold numbers are best-effort (marked).
// Usage: deno run -A bench/cold-warm.ts [--samples 5] > bench/out/cold-warm.json
import { activeSites, PAGES } from "./config.ts";

const samples = Number(Deno.args[Deno.args.indexOf("--samples") + 1] || 5);

async function timeRequest(url: string) {
  const start = performance.now();
  const res = await fetch(url, { redirect: "manual" });
  const firstByte = performance.now() - start;
  await res.arrayBuffer();
  const total = performance.now() - start;
  return {
    status: res.status,
    firstByte: Math.round(firstByte * 10) / 10,
    total: Math.round(total * 10) / 10,
    cache: res.headers.get("x-cache") ??
      res.headers.get("cache-status") ??
      res.headers.get("x-vercel-cache"),
  };
}

function median(nums: Array<number>) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const out: Record<string, Record<string, unknown>> = {};
for (const site of activeSites()) {
  out[site.name] = {};
  for (const page of PAGES) {
    const url = site.base + page.path;
    const first = await timeRequest(url);
    const warm: Array<Awaited<ReturnType<typeof timeRequest>>> = [];
    for (let i = 0; i < samples; i++) {
      warm.push(await timeRequest(url));
      await new Promise((r) => setTimeout(r, 150));
    }
    out[site.name]![page.name] = {
      first,
      warmMedianTtfb: median(warm.map((w) => w.firstByte)),
      warmCacheStates: warm.map((w) => w.cache),
    };
    console.error(`${site.name} ${page.name}: done`);
  }
}
console.log(JSON.stringify(out, null, 2));
