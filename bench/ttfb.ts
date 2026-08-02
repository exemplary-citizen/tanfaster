// Multi-region TTFB via the globalping API (https://globalping.io).
// Usage: deno run -A bench/ttfb.ts [--limit 3] > bench/out/ttfb.json
import { activeSites, PAGES, REGIONS } from "./config.ts";

const API = "https://api.globalping.io/v1/measurements";
const limit = Number(Deno.args[Deno.args.indexOf("--limit") + 1] || 3);

type Timing = { firstByte?: number; total?: number };

async function measure(url: string, region: string) {
  const create = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "http",
      target: new URL(url).hostname,
      locations: [{ magic: region, limit }],
      measurementOptions: {
        request: {
          path: new URL(url).pathname,
          ...(new URL(url).search.length > 1
            ? { query: new URL(url).search.slice(1) }
            : {}),
        },
        protocol: "HTTPS",
      },
    }),
  });
  if (!create.ok) {
    return { error: `${create.status} ${await create.text()}` };
  }
  const { id } = (await create.json()) as { id: string };
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${API}/${id}`);
    const body = (await res.json()) as {
      status: string;
      results: Array<{
        probe: { city: string; country: string };
        result: { status: string; timings?: Timing; rawHeaders?: string };
      }>;
    };
    if (body.status !== "in-progress") {
      return body.results.map((r) => ({
        probe: `${r.probe.city},${r.probe.country}`,
        firstByte: r.result.timings?.firstByte ?? null,
        cache:
          r.result.rawHeaders?.match(
            /(?:x-cache|cache-status|x-vercel-cache):\s*([^\r\n]+)/i,
          )?.[1] ?? null,
      }));
    }
  }
  return { error: "timeout" };
}

const out: Record<string, Record<string, Record<string, unknown>>> = {};
for (const site of activeSites()) {
  out[site.name] = {};
  for (const page of PAGES) {
    if (page.name === "search") continue;
    const url = site.base + page.path;
    out[site.name]![page.name] = {};
    for (const region of REGIONS) {
      // single measurement per point (anonymous rate limits are tight);
      // per-probe cache state is recorded so the report can segment
      // edge-hit vs origin-fetch numbers honestly.
      const result = await measure(url, region);
      out[site.name]![page.name]![region] = result;
      console.error(`${site.name} ${page.name} ${region}: done`);
    }
  }
}
console.log(JSON.stringify(out, null, 2));
