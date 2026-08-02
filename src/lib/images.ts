const BLOB_HOST = "https://bevgyjm5apuichhj.public.blob.vercel-storage.com";

const CDN_BASE = (import.meta.env.VITE_IMAGE_CDN_BASE as string | undefined) ??
  "";

export type ImageOpts = { width?: number; quality?: number };

// Host-swap seam: with no CDN configured we hotlink the original public blob
// store (dev); with IMAGE_CDN_BASE set we serve through imgproxy/Railway CDN
// (Phase 5). The DB keeps the original URLs either way.
export function imageUrl(
  src: string | null | undefined,
  _opts: ImageOpts = {},
): string {
  if (!src) return "/placeholder.svg";
  if (!CDN_BASE) return src;
  return src.replace(BLOB_HOST, CDN_BASE);
}

// The variants product cards actually render, so link-hover warming hits the
// same URLs the navigation will request.
export function imageWarmVariants(src: string): Array<string> {
  return [imageUrl(src, { width: 256, quality: 80 })];
}
