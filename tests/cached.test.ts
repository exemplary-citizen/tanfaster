import { describe, expect, it } from "vitest";
import { cached, requestStore, revalidateTag } from "../src/lib/cached";

describe("cached", () => {
  it("dedupes calls within one request scope", async () => {
    let calls = 0;
    const fn = cached(
      async (x: number) => {
        calls++;
        return x * 2;
      },
      ["dedupe-test"],
      { revalidate: 60 },
    );
    await requestStore.run(new Map(), async () => {
      const [a, b, c] = await Promise.all([fn(1), fn(1), fn(1)]);
      expect([a, b, c]).toEqual([2, 2, 2]);
    });
    expect(calls).toBe(1);
  });

  it("serves from TTL cache across request scopes and misses different args", async () => {
    let calls = 0;
    const fn = cached(
      async (x: number) => {
        calls++;
        return x + 1;
      },
      ["ttl-test"],
      { revalidate: 60 },
    );
    await requestStore.run(new Map(), () => fn(5));
    await requestStore.run(new Map(), () => fn(5));
    expect(calls).toBe(1);
    await requestStore.run(new Map(), () => fn(6));
    expect(calls).toBe(2);
  });

  it("revalidateTag invalidates tagged entries", async () => {
    let calls = 0;
    const fn = cached(
      async () => {
        calls++;
        return calls;
      },
      ["tag-test"],
      { revalidate: 60, tags: ["test-tag"] },
    );
    await fn();
    await fn();
    expect(calls).toBe(1);
    revalidateTag("test-tag");
    await fn();
    expect(calls).toBe(2);
  });

  it("does not cache rejected promises", async () => {
    let calls = 0;
    const fn = cached(
      async () => {
        calls++;
        if (calls === 1) throw new Error("boom");
        return "ok";
      },
      ["error-test"],
      { revalidate: 60 },
    );
    await requestStore.run(new Map(), async () => {
      await expect(fn()).rejects.toThrow("boom");
    });
    await requestStore.run(new Map(), async () => {
      await expect(fn()).resolves.toBe("ok");
    });
    expect(calls).toBe(2);
  });
});
