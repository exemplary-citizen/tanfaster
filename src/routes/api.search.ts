import { createFileRoute } from "@tanstack/react-router";
import { getSearchResults } from "~/lib/queries";

export type ProductSearchResult = {
  href: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  price: string;
  subcategory_slug: string;
}[];

const headers = {
  "cache-control": "public, s-maxage=600",
  "deno-cache-tag": "search",
};

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      // format is /api/search?q=term
      GET: async ({ request }) => {
        const searchTerm = new URL(request.url).searchParams.get("q");
        if (!searchTerm || !searchTerm.length) {
          return Response.json([], { headers });
        }

        const results = await getSearchResults(searchTerm);

        const searchResults: ProductSearchResult = results.map((item) => {
          const href = `/products/${item.categories.slug}/${item.subcategories.slug}/${item.products.slug}`;
          return {
            ...item.products,
            href,
          };
        });
        return Response.json(searchResults, { headers });
      },
    },
  },
});
