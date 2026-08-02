"use client";

import { useSyncExternalStore } from "react";

// Reads the (non-httpOnly) cart cookie synchronously so the badge renders
// without any network fetch and without making the SSR HTML user-specific.
// Server snapshot is 0 items — the badge overlays absolutely, so hydration
// filling it in causes no layout shift.

export const CART_UPDATED_EVENT = "cart-updated";

export function notifyCartChanged() {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("focus", callback);
  };
}

function readCartCount(): number {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("cart="))
    ?.slice("cart=".length);
  if (!raw) return 0;
  try {
    const items = JSON.parse(decodeURIComponent(raw)) as Array<{
      quantity?: number;
    }>;
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  } catch {
    return 0;
  }
}

export function CartBadge() {
  const count = useSyncExternalStore(
    subscribe,
    readCartCount,
    () => 0,
  );
  if (count === 0) return null;
  return (
    <div className="absolute -right-3 -top-1 rounded-full bg-accent1 px-1 text-xs text-white">
      {count}
    </div>
  );
}
