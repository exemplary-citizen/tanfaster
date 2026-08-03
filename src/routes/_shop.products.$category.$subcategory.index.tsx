import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router";
import { ProductLink } from "~/components/ui/product-card";
import { CACHE_HEADERS } from "~/lib/cache";
import {
  getProductsForSubcategoryFn,
  getSubcategoryFn,
  getSubcategoryProductCountFn,
} from "~/lib/functions/data";

// Port of NextFaster's products/[category]/[subcategory]/page.tsx. The
// subcategory row and indexed count are awaited (head needs them); the
// product grid — the heavy query and payload — is deferred so the shell
// streams at ~TTFB.

type GridProduct = {
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
};

export const Route = createFileRoute(
  "/_shop/products/$category/$subcategory/",
)({
  loader: async ({ params }) => {
    const productsPromise: Promise<Array<GridProduct>> = defer(
      getProductsForSubcategoryFn({ data: params.subcategory }).then((list) =>
        list.map(({ slug, name, description, image_url }) => ({
          slug,
          name,
          description,
          image_url,
        })),
      ),
    );
    const [subcategory, countRes] = await Promise.all([
      getSubcategoryFn({ data: params.subcategory }),
      getSubcategoryProductCountFn({ data: params.subcategory }),
    ]);
    if (!subcategory) {
      throw notFound();
    }
    return { productsPromise, subcategory, countRes };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const { subcategory, countRes } = loaderData;
    const count = countRes[0]?.count;
    const description = count
      ? `Choose from over ${count - 1} products in ${subcategory.name}. In stock and ready to ship.`
      : undefined;
    return {
      meta: [
        { title: `${subcategory.name} | TanFaster` },
        { property: "og:title", content: subcategory.name },
        ...(description
          ? [{ property: "og:description", content: description }]
          : []),
        {
          property: "og:image",
          content: `/api/og/${params.category}/${params.subcategory}`,
        },
      ],
    };
  },
  headers: ({ params }) => ({
    ...CACHE_HEADERS.product,
    "deno-cache-tag": `products,categories,subcategory:${params.subcategory}`,
  }),
  component: SubcategoryPage,
});

function SubcategoryPage() {
  const { productsPromise, countRes } = Route.useLoaderData();
  const { category, subcategory } = Route.useParams();

  const finalCount = countRes[0]?.count ?? 0;
  return (
    <div className="container mx-auto p-4">
      {finalCount > 0 ? (
        <h1 className="mb-2 border-b-2 text-sm font-bold">
          {finalCount} {finalCount === 1 ? "Product" : "Products"}
        </h1>
      ) : (
        <p>No products for this subcategory</p>
      )}
      <div className="flex flex-row flex-wrap gap-2">
        <Await promise={productsPromise} fallback={null}>
          {(products) =>
            products.map((product) => (
              <ProductLink
                key={product.name}
                loading="eager"
                category_slug={category}
                subcategory_slug={subcategory}
                product={product}
                imageUrl={product.image_url}
              />
            ))}
        </Await>
      </div>
    </div>
  );
}
