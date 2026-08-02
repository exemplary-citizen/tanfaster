import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Link } from "~/components/ui/link";
import { getCollectionsFn } from "~/lib/functions/data";

// Port of NextFaster's (category-sidebar)/layout.tsx. No cache headers here —
// each leaf route owns its own Cache-Control / Deno-Cache-Tag.

export const Route = createFileRoute("/_shop")({
  loader: () => getCollectionsFn(),
  component: ShopLayout,
});

function ShopLayout() {
  const collections = Route.useLoaderData();
  return (
    <div className="flex flex-grow font-mono">
      <aside className="fixed left-0 hidden w-64 min-w-64 max-w-64 overflow-y-auto border-r p-4 md:block md:h-full">
        <h2 className="border-b border-accent1 text-sm font-semibold text-accent1">
          Choose a Category
        </h2>
        <ul className="flex flex-col items-start justify-center">
          {collections.map((collection) => (
            <li key={collection.slug} className="w-full">
              <Link
                prefetch={true}
                href={`/${collection.slug}`}
                className="block w-full py-1 text-xs text-gray-800 hover:bg-accent2 hover:underline"
              >
                {collection.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main
        className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 md:pl-64"
        id="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}
