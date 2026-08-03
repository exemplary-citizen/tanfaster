import { count, eq, sql } from "drizzle-orm";
import { db } from "~/db/client";
import {
  categories,
  products,
  subcategories,
  subcollections,
} from "~/db/schema";
import { cached } from "~/lib/cached";

const TWO_HOURS = 60 * 60 * 2;

export const getProductsForSubcategory = cached(
  (subcategorySlug: string) =>
    db.query.products.findMany({
      where: (products, { eq, and }) =>
        and(eq(products.subcategory_slug, subcategorySlug)),
      orderBy: (products, { asc }) => asc(products.slug),
    }),
  ["subcategory-products"],
  { revalidate: TWO_HOURS, tags: ["products"] },
);

export const getCollections = cached(
  () =>
    db.query.collections.findMany({
      with: {
        categories: true,
      },
      orderBy: (collections, { asc }) => asc(collections.name),
    }),
  ["collections"],
  { revalidate: TWO_HOURS, tags: ["collections"] },
);

// Sidebar-only variant: 19 rows of name+slug instead of the full nested
// collections->categories tree. The full tree serializes to ~100KB of loader
// data that would otherwise sit before the visible content on EVERY page.
export const getCollectionsLight = cached(
  () =>
    db.query.collections.findMany({
      columns: { id: true, name: true, slug: true },
      orderBy: (collections, { asc }) => asc(collections.name),
    }),
  ["collections-light"],
  { revalidate: TWO_HOURS, tags: ["collections"] },
);

export const getProductDetails = cached(
  (productSlug: string) =>
    db.query.products.findFirst({
      where: (products, { eq }) => eq(products.slug, productSlug),
    }),
  ["product"],
  { revalidate: TWO_HOURS, tags: ["products"] },
);

export const getSubcategory = cached(
  (subcategorySlug: string) =>
    db.query.subcategories.findFirst({
      where: (subcategories, { eq }) => eq(subcategories.slug, subcategorySlug),
    }),
  ["subcategory"],
  { revalidate: TWO_HOURS, tags: ["categories"] },
);

export const getCategory = cached(
  (categorySlug: string) =>
    db.query.categories.findFirst({
      where: (categories, { eq }) => eq(categories.slug, categorySlug),
      with: {
        subcollections: {
          with: {
            subcategories: true,
          },
        },
      },
    }),
  ["category"],
  { revalidate: TWO_HOURS, tags: ["categories"] },
);

export const getCollectionDetails = cached(
  (collectionSlug: string) =>
    db.query.collections.findMany({
      with: {
        categories: true,
      },
      where: (collections, { eq }) => eq(collections.slug, collectionSlug),
      orderBy: (collections, { asc }) => asc(collections.slug),
    }),
  ["collection"],
  { revalidate: TWO_HOURS, tags: ["collections"] },
);

export const getProductCount = cached(
  () => db.select({ count: count() }).from(products),
  ["total-product-count"],
  { revalidate: TWO_HOURS, tags: ["products"] },
);

// could be optimized by storing category slug on the products table
export const getCategoryProductCount = cached(
  (categorySlug: string) =>
    db
      .select({ count: count() })
      .from(categories)
      .leftJoin(
        subcollections,
        eq(categories.slug, subcollections.category_slug),
      )
      .leftJoin(
        subcategories,
        eq(subcollections.id, subcategories.subcollection_id),
      )
      .leftJoin(products, eq(subcategories.slug, products.subcategory_slug))
      .where(eq(categories.slug, categorySlug)),
  ["category-product-count"],
  { revalidate: TWO_HOURS, tags: ["products"] },
);

export const getSubcategoryProductCount = cached(
  (subcategorySlug: string) =>
    db
      .select({ count: count() })
      .from(products)
      .where(eq(products.subcategory_slug, subcategorySlug)),
  ["subcategory-product-count"],
  { revalidate: TWO_HOURS, tags: ["products"] },
);

export const getSearchResults = cached(
  async (searchTerm: string) => {
    let results;

    if (searchTerm.length <= 2) {
      results = await db
        .select()
        .from(products)
        .where(sql`${products.name} ILIKE ${searchTerm + "%"}`)
        .limit(5)
        .innerJoin(
          subcategories,
          sql`${products.subcategory_slug} = ${subcategories.slug}`,
        )
        .innerJoin(
          subcollections,
          sql`${subcategories.subcollection_id} = ${subcollections.id}`,
        )
        .innerJoin(
          categories,
          sql`${subcollections.category_slug} = ${categories.slug}`,
        );
    } else {
      const formattedSearchTerm = searchTerm
        .split(" ")
        .filter((term) => term.trim() !== "")
        .map((term) => `${term}:*`)
        .join(" & ");

      results = await db
        .select()
        .from(products)
        .where(
          sql`to_tsvector('english', ${products.name}) @@ to_tsquery('english', ${formattedSearchTerm})`,
        )
        .limit(5)
        .innerJoin(
          subcategories,
          sql`${products.subcategory_slug} = ${subcategories.slug}`,
        )
        .innerJoin(
          subcollections,
          sql`${subcategories.subcollection_id} = ${subcollections.id}`,
        )
        .innerJoin(
          categories,
          sql`${subcollections.category_slug} = ${categories.slug}`,
        );
    }

    return results;
  },
  ["search-results"],
  { revalidate: TWO_HOURS, tags: ["search"] },
);
