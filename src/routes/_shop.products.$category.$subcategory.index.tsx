import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProductLink } from "~/components/ui/product-card";
import { CACHE_HEADERS } from "~/lib/cache";
import {
  getProductsForSubcategoryFn,
  getSubcategoryFn,
  getSubcategoryProductCountFn,
} from "~/lib/functions/data";

// Port of NextFaster's products/[category]/[subcategory]/page.tsx.

export const Route = createFileRoute(
  "/_shop/products/$category/$subcategory/",
)({
  loader: async ({ params }) => {
    const [products, subcategory, countRes] = await Promise.all([
      getProductsForSubcategoryFn({ data: params.subcategory }),
      getSubcategoryFn({ data: params.subcategory }),
      getSubcategoryProductCountFn({ data: params.subcategory }),
    ]);
    if (!subcategory) {
      throw notFound();
    }
    return { products, subcategory, countRes };
  },
  head: ({ loaderData }) => {
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
  const { products, countRes } = Route.useLoaderData();
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
        {products.map((product) => (
          <ProductLink
            key={product.name}
            loading="eager"
            category_slug={category}
            subcategory_slug={subcategory}
            product={product}
            imageUrl={product.image_url}
          />
        ))}
      </div>
    </div>
  );
}
