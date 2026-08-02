"use client";

import { useServerFn } from "@tanstack/react-start";
import { useTransition } from "react";
import { toast } from "sonner";
import { notifyCartChanged } from "~/components/cart-badge";
import { addToCartFn } from "~/lib/functions/cart";

export function AddToCartForm({ productSlug }: { productSlug: string }) {
  const addToCart = useServerFn(addToCartFn);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const message = await addToCart({ data: { productSlug } });
          toast(message);
          notifyCartChanged();
        });
      }}
    >
      <button
        type="submit"
        className="max-w-[150px] rounded-[2px] bg-accent1 px-5 py-1 text-sm font-semibold text-white"
      >
        Add to cart
      </button>
      {isPending && <p>Adding to cart...</p>}
    </form>
  );
}
