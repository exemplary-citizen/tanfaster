import { createMiddleware } from "@tanstack/react-start";

export const CACHE_HEADERS = {
  home: {
    "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
  },
  product: {
    "cache-control": "public, max-age=0, s-maxage=7200, stale-while-revalidate=86400",
  },
  search: {
    "cache-control": "public, s-maxage=600",
  },
  private: {
    "cache-control": "private, no-store",
  },
} as const;

const CACHEABLE = /(?:^|,)\s*s-maxage=[1-9]/i;

// One Set-Cookie on a CDN-cacheable response silently disables caching on both
// Deno Deploy and Railway — fail loudly in dev, fail safe in prod.
export function enforceCookieSafety(
  response: Response,
  pathname: string,
  dev: boolean,
): Response {
  const setCookie = response.headers.get("set-cookie");
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!setCookie || !CACHEABLE.test(cacheControl)) {
    return response;
  }
  const message =
    `cookieWriteGuard: Set-Cookie emitted on CDN-cacheable response for ${pathname} ` +
    `(Cache-Control: ${cacheControl})`;
  if (dev) {
    throw new Error(message);
  }
  console.error(message);
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  headers.delete("deno-cache-tag");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const cookieWriteGuard = createMiddleware({ type: "request" }).server(
  async ({ next, pathname }) => {
    const result = await next();
    const safe = enforceCookieSafety(
      result.response,
      pathname,
      import.meta.env.DEV,
    );
    return safe === result.response ? result : { ...result, response: safe };
  },
);
