import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { detailedCart, getCart, updateCart } from "~/lib/cart.server";

const productSlugSchema = z.object({ productSlug: z.string().min(1) });

export const addToCartFn = createServerFn({ method: "POST" })
  .validator(productSlugSchema)
  .handler(async ({ data }) => {
    const prevCart = getCart();
    const existing = prevCart.find(
      (item) => item.productSlug === data.productSlug,
    );
    if (existing) {
      updateCart(
        prevCart.map((item) =>
          item.productSlug === data.productSlug
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      updateCart([...prevCart, { productSlug: data.productSlug, quantity: 1 }]);
    }
    return "Item added to cart" as const;
  });

export const removeFromCartFn = createServerFn({ method: "POST" })
  .validator(productSlugSchema)
  .handler(async ({ data }) => {
    const prevCart = getCart();
    if (!prevCart.some((item) => item.productSlug === data.productSlug)) {
      return;
    }
    updateCart(
      prevCart.filter((item) => item.productSlug !== data.productSlug),
    );
  });

export const getDetailedCartFn = createServerFn({ method: "GET" }).handler(() =>
  detailedCart(),
);
