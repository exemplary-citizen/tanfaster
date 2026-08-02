import { AsyncLocalStorage } from "node:async_hooks";

// Port of NextFaster's cache(unstable_cache(...)) pattern: per-request dedupe
// via AsyncLocalStorage plus a best-effort in-memory TTL cache. Per-instance
// and reset on cold start by design — the CDN (s-maxage + tags) is the real
// cache; this layer only absorbs duplicate queries within and across nearby
// requests on a warm isolate.

type TtlEntry = { value: unknown; expires: number };

const MAX_ENTRIES = 10_000;

const ttlStore = new Map<string, TtlEntry>();
const tagIndex = new Map<string, Set<string>>();

export const requestStore = new AsyncLocalStorage<
  Map<string, Promise<unknown>>
>();

function evictIfNeeded() {
  if (ttlStore.size <= MAX_ENTRIES) return;
  const overflow = ttlStore.size - MAX_ENTRIES;
  let i = 0;
  for (const key of ttlStore.keys()) {
    ttlStore.delete(key);
    if (++i >= overflow) break;
  }
}

export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: Array<string>,
  opts: { revalidate: number; tags?: Array<string> },
): (...args: A) => Promise<R> {
  return (...args: A) => {
    const key = `nf:${keyParts.join(":")}:${JSON.stringify(args)}`;
    const reqMap = requestStore.getStore();
    const inFlight = reqMap?.get(key);
    if (inFlight) return inFlight as Promise<R>;

    const hit = ttlStore.get(key);
    if (hit && hit.expires > Date.now()) {
      const p = Promise.resolve(hit.value as R);
      reqMap?.set(key, p);
      return p;
    }

    const p = fn(...args).then(
      (value) => {
        ttlStore.set(key, {
          value,
          expires: Date.now() + opts.revalidate * 1000,
        });
        for (const tag of opts.tags ?? []) {
          let keys = tagIndex.get(tag);
          if (!keys) tagIndex.set(tag, (keys = new Set()));
          keys.add(key);
        }
        evictIfNeeded();
        return value;
      },
      (err) => {
        reqMap?.delete(key);
        throw err;
      },
    );
    reqMap?.set(key, p);
    return p;
  };
}

export function revalidateTag(tag: string): number {
  const keys = tagIndex.get(tag);
  if (!keys) return 0;
  let n = 0;
  for (const key of keys) {
    if (ttlStore.delete(key)) n++;
  }
  tagIndex.delete(tag);
  return n;
}

export function cacheStats() {
  return { entries: ttlStore.size, tags: tagIndex.size };
}
