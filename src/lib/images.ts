const BLOB_HOST = "https://bevgyjm5apuichhj.public.blob.vercel-storage.com";

const CDN_BASE = (import.meta.env.VITE_IMAGE_CDN_BASE as string | undefined) ??
  "";

export type ImageOpts = { width?: number; quality?: number };

// Host-swap seam: with no CDN configured we hotlink the original public blob
// store (dev); with VITE_IMAGE_CDN_BASE set we serve resized WebP through
// imgproxy behind Railway CDN. The DB keeps the original URLs either way.
// Explicit @webp (not Accept negotiation) so the CDN caches one variant per
// URL without Vary concerns; 2x width keeps retina parity with next/image's
// DPR srcset.
export function imageUrl(
  src: string | null | undefined,
  opts: ImageOpts = {},
): string {
  if (!src) return "/placeholder.svg";
  if (!CDN_BASE || !src.startsWith(BLOB_HOST)) return src;
  const parts: Array<string> = [];
  if (opts.width) parts.push(`rs:fit:${opts.width * 2}:0`);
  if (opts.quality) parts.push(`q:${opts.quality}`);
  const processing = parts.length > 0 ? `/${parts.join("/")}` : "";
  return `${CDN_BASE}/unsafe${processing}/plain/${src}@webp`;
}

// The variants product cards actually render, so link-hover warming hits the
// same URLs the navigation will request.
export function imageWarmVariants(src: string): Array<string> {
  return [imageUrl(src, { width: 256, quality: 80 })];
}
