import { createFileRoute } from "@tanstack/react-router";
import { getEnv } from "~/lib/env";

// Same-origin image endpoint: /img/<width>/<quality>/<blob-path> forwards to
// imgproxy (over Railway private networking in production) and streams the
// WebP back with immutable caching. Same-origin means no second DNS+TLS
// connection before images start, and the Railway CDN caches these as static
// assets on the site's own domain. Only the known blob host can be fetched —
// the path is appended to it, so this is not an open proxy.

const BLOB_HOST = "https://bevgyjm5apuichhj.public.blob.vercel-storage.com";

export const Route = createFileRoute("/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const m = splat.match(/^(\d+)\/(\d+)\/(.+)$/s);
        if (!m || m[3]!.includes("..")) {
          return new Response("bad image path", { status: 400 });
        }
        const width = Number(m[1]);
        const quality = Number(m[2]);
        const blobPath = m[3]!;

        const origin = getEnv("IMGPROXY_ORIGIN") ??
          "https://imgproxy-production-b418.up.railway.app";
        const parts: Array<string> = [];
        if (width > 0) parts.push(`rs:fit:${width}:0`);
        if (quality > 0) parts.push(`q:${quality}`);
        const processing = parts.length > 0 ? `/${parts.join("/")}` : "";

        const upstream = await fetch(
          `${origin}/unsafe${processing}/plain/${BLOB_HOST}/${blobPath}@webp`,
        );
        if (!upstream.ok) {
          return new Response("upstream image error", {
            status: upstream.status === 404 ? 404 : 502,
          });
        }
        return new Response(upstream.body, {
          headers: {
            "content-type": upstream.headers.get("content-type") ??
              "image/webp",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
