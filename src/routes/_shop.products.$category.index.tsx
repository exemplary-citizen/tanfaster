import { createFileRoute, notFound } from "@tanstack/react-router";
import { Image } from "~/components/ui/image";
import { Link } from "~/components/ui/link";
import { CACHE_HEADERS } from "~/lib/cache";
import {
  getCategoryFn,
  getCategoryProductCountFn,
} from "~/lib/functions/data";

// Port of NextFaster's products/[category]/page.tsx plus its layout.tsx
// (the layout only contributed generateMetadata, folded into head() here).

export const Route = createFileRoute("/_shop/products/$category/")({
  loader: async ({ params }) => {
    const [category, countRes] = await Promise.all([
      getCategoryFn({ data: params.category }),
      getCategoryProductCountFn({ data: params.category }),
    ]);
    if (!category) {
      throw notFound();
    }
    return { category, countRes };
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    if (!category) return { meta: [] };
    const examples = category.subcollections
      .slice(0, 2)
      .map((s) => s.name)
      .join(", ")
      .toLowerCase();
    const description = `Choose from our selection of ${category.name.toLowerCase()}, including ${
      examples + (category.subcollections.length > 1 ? "," : "")
    } and more. In stock and ready to ship.`;
    return {
      meta: [
        { title: `${category.name} | TanFaster` },
        { property: "og:title", content: category.name },
        { property: "og:description", content: description },
      ],
    };
  },
  headers: ({ params }) => ({
    ...CACHE_HEADERS.product,
    "deno-cache-tag": `categories,products,category:${params.category}`,
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { category: cat, countRes } = Route.useLoaderData();
  const { category } = Route.useParams();

  const finalCount = countRes[0]?.count;

  return (
    <div className="container p-4">
      {finalCount ? (
        <h1 className="mb-2 border-b-2 text-sm font-bold">
          {finalCount} {finalCount === 1 ? "Product" : "Products"}
        </h1>
      ) : null}
      <div className="space-y-4">
        {cat.subcollections.map((subcollection, index) => (
          <div key={index}>
            <h2 className="mb-2 border-b-2 text-lg font-semibold">
              {subcollection.name}
            </h2>
            <div className="flex flex-row flex-wrap gap-2">
              {subcollection.subcategories.map(
                (subcategory, subcategoryIndex) => (
                  <Link
                    prefetch={true}
                    key={subcategoryIndex}
                    className="group flex h-full w-full flex-row gap-2 border px-4 py-2 hover:bg-gray-100 sm:w-[200px]"
                    href={`/products/${category}/${subcategory.slug}`}
                  >
                    <div className="py-2">
                      <Image
                        loading="eager"
                        decoding="sync"
                        src={subcategory.image_url ?? "/placeholder.svg"}
                        alt={`A small picture of ${subcategory.name}`}
                        width={48}
                        height={48}
                        quality={65}
                        className="h-12 w-12 flex-shrink-0 object-cover"
                      />
                    </div>
                    <div className="flex h-16 flex-grow flex-col items-start py-2">
                      <div className="text-sm font-medium text-gray-700 group-hover:underline">
                        {subcategory.name}
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
