import { describe, expect, it, vi } from "vitest";
import { enforceCookieSafety } from "../src/lib/cache";

function res(headers: Record<string, string>) {
  return new Response("body", { headers });
}

describe("enforceCookieSafety", () => {
  it("passes cacheable responses without cookies through untouched", () => {
    const r = res({ "cache-control": "public, s-maxage=7200" });
    expect(enforceCookieSafety(r, "/products/x", true)).toBe(r);
  });

  it("passes private responses with cookies through untouched", () => {
    const r = res({
      "cache-control": "private, no-store",
      "set-cookie": "cart=1",
    });
    expect(enforceCookieSafety(r, "/order", true)).toBe(r);
  });

  it("throws in dev when Set-Cookie coexists with s-maxage", () => {
    const r = res({
      "cache-control": "public, s-maxage=7200",
      "set-cookie": "cart=1",
    });
    expect(() => enforceCookieSafety(r, "/products/x", true)).toThrow(
      /cookieWriteGuard/,
    );
  });

  it("forces private,no-store and strips cache tags in prod", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = res({
      "cache-control": "public, s-maxage=7200",
      "set-cookie": "cart=1",
      "deno-cache-tag": "product-x",
    });
    const out = enforceCookieSafety(r, "/products/x", false);
    expect(out).not.toBe(r);
    expect(out.headers.get("cache-control")).toBe("private, no-store");
    expect(out.headers.get("deno-cache-tag")).toBeNull();
    expect(out.headers.get("set-cookie")).toBe("cart=1");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("ignores s-maxage=0", () => {
    const r = res({
      "cache-control": "public, s-maxage=0",
      "set-cookie": "cart=1",
    });
    expect(enforceCookieSafety(r, "/x", true)).toBe(r);
  });
});
