export const SITES = {
  vercel: "https://next-faster.vercel.app",
  railway: "https://web-production-b437.up.railway.app",
  // filled in when the Deno Deploy app exists:
  denoDeploy: Deno.env.get("DENO_DEPLOY_URL") ?? "",
} as const;

export const PAGES = [
  { name: "home", path: "/" },
  { name: "collection", path: "/drawing-and-sketching" },
  { name: "category", path: "/products/graphite-pencils" },
  { name: "subcategory", path: "/products/graphite-pencils/colored-pencils" },
  {
    name: "product",
    path: "/products/graphite-pencils/colored-pencils/basic-colors-set",
  },
  { name: "search", path: "/api/search?q=chocolate" },
] as const;

export const REGIONS = [
  "Seattle",
  "Sao Paulo",
  "Frankfurt",
  "Singapore",
  "Sydney",
] as const;

export function activeSites(): Array<{ name: string; base: string }> {
  return Object.entries(SITES)
    .filter(([, base]) => base !== "")
    .map(([name, base]) => ({ name, base }));
}
