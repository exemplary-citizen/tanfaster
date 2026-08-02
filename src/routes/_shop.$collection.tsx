import { createFileRoute, notFound } from "@tanstack/react-router";
import { Image } from "~/components/ui/image";
import { Link } from "~/components/ui/link";
import { CACHE_HEADERS } from "~/lib/cache";
import { getCollectionDetailsFn } from "~/lib/functions/data";

// Port of NextFaster's (category-sidebar)/[collection]/page.tsx.

export const Route = createFileRoute("/_shop/$collection")({
  loader: async ({ params }) => {
    const collections = await getCollectionDetailsFn({
      data: params.collection,
    });
    if (collections.length === 0) {
      throw notFound();
    }
    return collections;
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.[0]
      ? [{ title: `${loaderData[0].name} | TanFaster` }]
      : [],
  }),
  headers: ({ params }) => ({
    ...CACHE_HEADERS.home,
    "deno-cache-tag": `collections,collection:${params.collection}`,
  }),
  component: CollectionPage,
});

function CollectionPage() {
  const collections = Route.useLoaderData();
  let imageCount = 0;

  return (
    <div className="w-full p-4">
      {collections.map((collection) => (
        <div key={collection.name}>
          <h2 className="text-xl font-semibold">{collection.name}</h2>
          <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
            {collection.categories.map((category) => (
              <Link
                prefetch={true}
                key={category.name}
                className="flex w-[125px] flex-col items-center text-center"
                href={`/products/${category.slug}`}
              >
                <Image
                  loading={imageCount++ < 15 ? "eager" : "lazy"}
                  decoding="sync"
                  src={category.image_url ?? "/placeholder.svg"}
                  alt={`A small picture of ${category.name}`}
                  className="mb-2 h-14 w-14 border hover:bg-accent2"
                  width={48}
                  height={48}
                  quality={65}
                />
                <span className="text-xs">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
