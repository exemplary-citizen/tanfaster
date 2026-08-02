// Warms the CDN for the image variants on landing surfaces: the home grid
// (category images) and every category page grid (subcategory images).
// Product thumbnails (the ~85k long tail) are intentionally left cold — the
// same-origin proxy makes their first view cheap enough.
// Usage: DATABASE_URL=... deno run -A scripts/warm-images.ts https://site.example
const target = Deno.args[0];
if (!target) {
  console.error("usage: warm-images.ts <site-base-url>");
  Deno.exit(1);
}

const BLOB_HOST = "https://bevgyjm5apuichhj.public.blob.vercel-storage.com";
const CONCURRENCY = 20;

import postgres from "postgres";
const sql = postgres(Deno.env.get("DATABASE_URL")!, { prepare: false });

const rows = await sql`
  SELECT DISTINCT image_url FROM (
    SELECT image_url FROM categories WHERE image_url IS NOT NULL
    UNION ALL
    SELECT image_url FROM subcategories WHERE image_url IS NOT NULL
  ) t
`;
await sql.end();

const urls = rows
  .map((r) => r.image_url as string)
  .filter((u) => u.startsWith(BLOB_HOST))
  .map((u) => `${target}/img/96/65/${u.slice(BLOB_HOST.length + 1)}`);

console.log(`warming ${urls.length} grid image variants against ${target}`);

let ok = 0, fail = 0, bytes = 0;
const started = performance.now();
const queue = [...urls];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const url = queue.pop()!;
      try {
        const res = await fetch(url);
        const body = await res.arrayBuffer();
        if (res.ok) {
          ok++;
          bytes += body.byteLength;
        } else fail++;
      } catch {
        fail++;
      }
      if ((ok + fail) % 500 === 0) {
        console.error(`  ${ok + fail}/${urls.length}`);
      }
    }
  }),
);
const secs = ((performance.now() - started) / 1000).toFixed(0);
console.log(
  `done: ${ok} ok, ${fail} failed, ${(bytes / 1e6).toFixed(0)}MB in ${secs}s`,
);
