const BLOB_HOST = "https://bevgyjm5apuichhj.public.blob.vercel-storage.com";

// Any value in VITE_IMAGE_CDN_BASE switches the image pipeline on; URLs then
// go through the same-origin /img proxy route (which talks to imgproxy over
// Railway private networking). Unset = dev hotlinking of the original blob
// store. The DB keeps original URLs either way.
const PIPELINE_ON = Boolean(import.meta.env.VITE_IMAGE_CDN_BASE);

export type ImageOpts = { width?: number; quality?: number };

// 2x width keeps retina parity with next/image's DPR srcset.
export function imageUrl(
  src: string | null | undefined,
  opts: ImageOpts = {},
): string {
  if (!src) return "/placeholder.svg";
  if (!PIPELINE_ON || !src.startsWith(BLOB_HOST)) return src;
  const path = src.slice(BLOB_HOST.length + 1);
  const width = opts.width ? opts.width * 2 : 0;
  const quality = opts.quality ?? 0;
  return `/img/${width}/${quality}/${path}`;
}

// The variants the TARGET page actually renders, so link-hover warming hits
// the same URLs the navigation will request: 48px q65 grid thumbs (grids
// render every loader-data product at that size) and the 256px q80 hero
// (what a product page shows). Warming the wrong size is worse than not
// warming — the browser caches a variant nothing renders.
export function imageWarmVariants(src: string): Array<string> {
  return [
    imageUrl(src, { width: 48, quality: 65 }),
    imageUrl(src, { width: 256, quality: 80 }),
  ];
}
