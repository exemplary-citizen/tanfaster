import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCategory,
  getCategoryProductCount,
  getCollectionDetails,
  getCollections,
  getProductCount,
  getProductDetails,
  getProductsForSubcategory,
  getSubcategory,
  getSubcategoryProductCount,
} from "~/lib/queries";

// GET server functions wrapping the cached queries. Route loaders call these:
// direct invocation during SSR, RPC fetch on client navigation (the
// router.prefetch payload equivalent).

const slug = z.string().min(1);

export const getCollectionsFn = createServerFn({ method: "GET" }).handler(() =>
  getCollections(),
);

export const getCollectionDetailsFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getCollectionDetails(data));

export const getCategoryFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getCategory(data));

export const getCategoryProductCountFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getCategoryProductCount(data));

export const getSubcategoryFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getSubcategory(data));

export const getProductsForSubcategoryFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getProductsForSubcategory(data));

export const getSubcategoryProductCountFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getSubcategoryProductCount(data));

export const getProductDetailsFn = createServerFn({ method: "GET" })
  .validator(slug)
  .handler(({ data }) => getProductDetails(data));

export const getProductCountFn = createServerFn({ method: "GET" }).handler(() =>
  getProductCount(),
);
