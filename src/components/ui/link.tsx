"use client";

import { Link as RouterLink, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { imageWarmVariants } from "~/lib/images";

// Port of NextFaster's custom Link: viewport-dwell (300ms) route preload plus
// image warming, hover re-warm, and mousedown navigation. Image URLs come from
// the preloaded loader data instead of the original's HTML-scraping
// /api/prefetch-images route.

type LinkProps = Omit<React.ComponentProps<"a">, "href"> & {
  href: string;
  prefetch?: boolean;
};

const AnyRouterLink = RouterLink as unknown as (
  props: Record<string, unknown>,
) => React.ReactElement;

const warmed = new Set<string>();
const imageCache = new Map<string, Array<string>>();

function collectImageUrls(
  value: unknown,
  out: Array<string>,
  depth = 0,
): void {
  if (!value || depth > 5 || out.length >= 12) return;
  if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.image_url === "string") out.push(rec.image_url);
    for (const k in rec) {
      if (k !== "image_url") collectImageUrls(rec[k], out, depth + 1);
    }
  }
}

function warmImage(url: string) {
  if (warmed.has(url)) return;
  warmed.add(url);
  const img = new window.Image();
  img.decoding = "async";
  img.fetchPriority = "low";
  img.src = url;
}

export function Link({ children, href, prefetch, ...props }: LinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  const preloadWithImages = () => {
    void router
      .preloadRoute({ to: href } as never)
      .then((matches) => {
        if (imageCache.has(href)) return;
        const urls: Array<string> = [];
        for (const match of matches ?? []) {
          collectImageUrls(match.loaderData, urls);
        }
        const variants = urls.flatMap(imageWarmVariants);
        imageCache.set(href, variants);
        for (const url of variants) warmImage(url);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (prefetch === false) return;
    const el = linkRef.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          timeout = setTimeout(() => {
            preloadWithImages();
            observer.unobserve(entry.target);
          }, 300);
        } else if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      },
      { rootMargin: "0px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, prefetch]);

  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <AnyRouterLink
      ref={linkRef}
      to={href}
      preload={false}
      onMouseEnter={() => {
        preloadWithImages();
        for (const url of imageCache.get(href) ?? []) warmImage(url);
      }}
      onMouseDown={(e: React.MouseEvent) => {
        if (
          e.button === 0 &&
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          e.preventDefault();
          void router.navigate({ to: href } as never);
        }
      }}
      {...props}
    >
      {children}
    </AnyRouterLink>
  );
}
