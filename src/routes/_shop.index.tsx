import { Await, createFileRoute, defer } from "@tanstack/react-router";
import { Image } from "~/components/ui/image";
import { Link } from "~/components/ui/link";
import { CACHE_HEADERS } from "~/lib/cache";
import { getCollectionsFn, getProductCountFn } from "~/lib/functions/data";

// Port of NextFaster's (category-sidebar)/page.tsx — the home page's full
// collections/categories grid. Both queries are deferred: the shell
// (header + sidebar) streams at ~TTFB and the grid follows, so the ~100KB
// nested collections payload never delays first paint.

export const Route = createFileRoute("/_shop/")({
  loader: () => ({
    collectionsPromise: defer(getCollectionsFn()),
    countPromise: defer(getProductCountFn()),
  }),
  headers: () => ({
    ...CACHE_HEADERS.home,
    "deno-cache-tag": "home,collections,products",
  }),
  component: Home,
});

function Home() {
  const { collectionsPromise, countPromise } = Route.useLoaderData();

  return (
    <div className="w-full p-4">
      <Await
        promise={countPromise}
        fallback={
          <div className="mb-2 w-full flex-grow border-b-[1px] border-accent1 text-sm font-semibold text-black">
            {" "}
          </div>
        }
      >
        {(productCount) => (
          <div className="mb-2 w-full flex-grow border-b-[1px] border-accent1 text-sm font-semibold text-black">
            Explore {productCount.at(0)?.count.toLocaleString()} products
          </div>
        )}
      </Await>
      <Await promise={collectionsPromise} fallback={null}>
        {(collections) => <CollectionsGrid collections={collections} />}
      </Await>
    </div>
  );
}

function CollectionsGrid(props: {
  collections: Awaited<ReturnType<typeof getCollectionsFn>>;
}) {
  let imageCount = 0;

  return (
    <>
      {props.collections.map((collection) => (
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
    </>
  );
}
