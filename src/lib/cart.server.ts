import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "~/db/client";

const cartSchema = z.array(
  z.object({
    productSlug: z.string(),
    quantity: z.number(),
  }),
);

export type CartItem = z.infer<typeof cartSchema>[number];

// Unlike the original this cookie is NOT httpOnly: the cart badge reads it
// synchronously from document.cookie so cacheable SSR HTML never has to carry
// per-user state. Contents are only slugs and quantities.
export function updateCart(newItems: Array<CartItem>) {
  setCookie("cart", JSON.stringify(newItems), {
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function getCart(): Array<CartItem> {
  const cart = getCookie("cart");
  if (!cart) return [];
  try {
    return cartSchema.parse(JSON.parse(cart));
  } catch {
    console.error("Failed to parse cart cookie");
    return [];
  }
}

export async function detailedCart() {
  const cart = getCart();

  const products = await db.query.products.findMany({
    where: (products, { inArray }) =>
      inArray(
        products.slug,
        cart.map((item) => item.productSlug),
      ),
    with: {
      subcategory: {
        with: {
          subcollection: true,
        },
      },
    },
  });

  return products.map((product) => ({
    ...product,
    quantity:
      cart.find((item) => item.productSlug === product.slug)?.quantity ?? 0,
  }));
}
