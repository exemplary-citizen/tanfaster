// Merges bench/out/*.json into a markdown comparison report.
// Usage: deno run -A bench/report.ts > bench/out/REPORT.md
const OUT = "bench/out";

async function load(name: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await Deno.readTextFile(`${OUT}/${name}`));
  } catch {
    return null;
  }
}

const coldWarm = await load("cold-warm.json") as Record<
  string,
  Record<string, { first: { firstByte: number; cache: string | null }; warmMedianTtfb: number }>
> | null;
const ttfb = await load("ttfb.json") as Record<
  string,
  Record<string, Record<string, Array<{ probe: string; firstByte: number | null }> | { error: string }>>
> | null;
const psi = await load("psi.json") as Record<
  string,
  Record<string, Record<string, number | null>>
> | null;

const lines: Array<string> = ["# TanFaster vs NextFaster — benchmark report", ""];
lines.push(`Generated from ${OUT}/*.json. Sites: vercel = next-faster.vercel.app (original), railway + denoDeploy = this port.`, "");

if (coldWarm) {
  lines.push("## Warm TTFB from benchmark machine (median ms)", "");
  const sites = Object.keys(coldWarm);
  const pages = Object.keys(coldWarm[sites[0]!] ?? {});
  lines.push(`| page | ${sites.join(" | ")} |`, `|---|${sites.map(() => "---:").join("|")}|`);
  for (const p of pages) {
    lines.push(
      `| ${p} | ${sites.map((s) => coldWarm[s]?.[p]?.warmMedianTtfb ?? "-").join(" | ")} |`,
    );
  }
  lines.push("", "## Cold-ish first request TTFB (ms, cache state shown)", "");
  lines.push(`| page | ${sites.join(" | ")} |`, `|---|${sites.map(() => "---").join("|")}|`);
  for (const p of pages) {
    lines.push(
      `| ${p} | ${sites.map((s) => {
        const f = coldWarm[s]?.[p]?.first;
        return f ? `${f.firstByte} (${f.cache ?? "?"})` : "-";
      }).join(" | ")} |`,
    );
  }
  lines.push("");
}

if (ttfb) {
  lines.push("## Multi-region warm TTFB via globalping (ms, median of probes)", "");
  const sites = Object.keys(ttfb);
  const pages = Object.keys(ttfb[sites[0]!] ?? {});
  for (const p of pages) {
    lines.push(`### ${p}`, "");
    const regions = Object.keys(ttfb[sites[0]!]?.[p] ?? {});
    lines.push(`| region | ${sites.join(" | ")} |`, `|---|${sites.map(() => "---:").join("|")}|`);
    for (const r of regions) {
      lines.push(
        `| ${r} | ${sites.map((s) => {
          const v = ttfb[s]?.[p]?.[r];
          if (!v || !Array.isArray(v)) return "-";
          const nums = v.map((x) => x.firstByte).filter((n): n is number => n !== null).sort((a, b) => a - b);
          return nums.length ? String(nums[Math.floor(nums.length / 2)]) : "-";
        }).join(" | ")} |`,
      );
    }
    lines.push("");
  }
}

if (psi) {
  lines.push("## Lighthouse lab (PSI), medians", "");
  const sites = Object.keys(psi);
  const keys = Object.keys(psi[sites[0]!] ?? {});
  lines.push(
    `| page:strategy | metric | ${sites.join(" | ")} |`,
    `|---|---|${sites.map(() => "---:").join("|")}|`,
  );
  for (const k of keys) {
    for (const metric of ["performance", "lcpMs", "tbtMs", "cls"]) {
      lines.push(
        `| ${k} | ${metric} | ${sites.map((s) => psi[s]?.[k]?.[metric] ?? "-").join(" | ")} |`,
      );
    }
  }
  lines.push("");
}

console.log(lines.join("\n"));
