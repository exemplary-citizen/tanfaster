// PageSpeed Insights lab runs (Lighthouse) for each site x page x strategy.
// Usage: PSI_API_KEY=... deno run -A bench/psi.ts [--runs 5] > bench/out/psi.json
import { activeSites, PAGES } from "./config.ts";

const KEY = Deno.env.get("PSI_API_KEY") ?? "";
const runs = Number(Deno.args[Deno.args.indexOf("--runs") + 1] || 5);
const API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

type LabMetrics = {
  performance: number | null;
  lcpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
  cls: number | null;
  speedIndexMs: number | null;
};

async function run(url: string, strategy: string): Promise<LabMetrics | { error: string }> {
  const params = new URLSearchParams({ url, strategy, category: "PERFORMANCE" });
  if (KEY) params.set("key", KEY);
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) return { error: `${res.status}` };
  const body = (await res.json()) as {
    lighthouseResult?: {
      categories?: { performance?: { score?: number } };
      audits?: Record<string, { numericValue?: number }>;
    };
  };
  const lr = body.lighthouseResult;
  const audit = (id: string) => lr?.audits?.[id]?.numericValue ?? null;
  return {
    performance: lr?.categories?.performance?.score ?? null,
    lcpMs: audit("largest-contentful-paint"),
    fcpMs: audit("first-contentful-paint"),
    tbtMs: audit("total-blocking-time"),
    cls: audit("cumulative-layout-shift"),
    speedIndexMs: audit("speed-index"),
  };
}

function median(nums: Array<number>) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
}

const out: Record<string, Record<string, unknown>> = {};
for (const site of activeSites()) {
  out[site.name] = {};
  for (const page of PAGES) {
    if (page.name === "search") continue;
    const url = site.base + page.path;
    for (const strategy of ["mobile", "desktop"]) {
      const results: Array<LabMetrics> = [];
      for (let i = 0; i < runs; i++) {
        const r = await run(url, strategy);
        if ("error" in r) {
          console.error(`${site.name} ${page.name} ${strategy} run ${i}: ${r.error}`);
        } else {
          results.push(r);
        }
        await new Promise((res) => setTimeout(res, 30_000));
      }
      const med = (k: keyof LabMetrics) =>
        median(results.map((r) => r[k]).filter((v): v is number => v !== null));
      out[site.name]![`${page.name}:${strategy}`] = {
        runs: results.length,
        performance: med("performance"),
        lcpMs: med("lcpMs"),
        fcpMs: med("fcpMs"),
        tbtMs: med("tbtMs"),
        cls: med("cls"),
        speedIndexMs: med("speedIndexMs"),
      };
      console.error(`${site.name} ${page.name} ${strategy}: ${results.length} runs`);
    }
  }
}
console.log(JSON.stringify(out, null, 2));
