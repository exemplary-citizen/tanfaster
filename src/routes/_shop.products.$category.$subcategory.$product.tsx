import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router";
import { AddToCartForm } from "~/components/add-to-cart-form";
import { Image } from "~/components/ui/image";
import { ProductLink } from "~/components/ui/product-card";
import { CACHE_HEADERS } from "~/lib/cache";
import {
  getProductDetailsFn,
  getProductsForSubcategoryFn,
} from "~/lib/functions/data";

// Port of NextFaster's products/[category]/[subcategory]/[product]/page.tsx.
// The product row is awaited (head/meta and the above-fold section need it);
// the "Explore more products" sibling grid is a DEFERRED promise so streaming
// SSR can flush the shell at ~TTFB and stream the grid when the query lands —
// the PPR-shell equivalent. It is also trimmed to the fields the cards render,
// which roughly halves the serialized loader payload on this page.

type RelatedProduct = {
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
};

export const Route = createFileRoute(
  "/_shop/products/$category/$subcategory/$product",
)({
  loader: async ({ params }) => {
    const relatedPromise: Promise<Array<RelatedProduct>> = defer(
      getProductsForSubcategoryFn({ data: params.subcategory }).then((list) =>
        list.map(({ slug, name, description, image_url }) => ({
          slug,
          name,
          description,
          image_url,
        })),
      ),
    );
    const product = await getProductDetailsFn({ data: params.product });
    if (!product) {
      throw notFound();
    }
    return { product, relatedPromise };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    if (!product) return { meta: [] };
    return {
      meta: [
        { title: `${product.name} | TanFaster` },
        { property: "og:title", content: product.name },
        { property: "og:description", content: product.description },
        {
          property: "og:image",
          content: `/api/og/${params.category}/${params.subcategory}/${params.product}`,
        },
      ],
    };
  },
  headers: ({ params }) => ({
    ...CACHE_HEADERS.product,
    "deno-cache-tag": `products,product:${params.product}`,
  }),
  component: ProductPage,
});

function ProductPage() {
  const { product: productData, relatedPromise } = Route.useLoaderData();

  return (
    <div className="container p-4">
      <h1 className="border-t-2 pt-1 text-xl font-bold text-accent1">
        {productData.name}
      </h1>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          <Image
            loading="eager"
            decoding="sync"
            src={productData.image_url ?? "/placeholder.svg?height=64&width=64"}
            alt={`A small picture of ${productData.name}`}
            height={256}
            quality={80}
            width={256}
            className="h-56 w-56 flex-shrink-0 border-2 md:h-64 md:w-64"
          />
          <p className="flex-grow text-base">{productData.description}</p>
        </div>
        <p className="text-xl font-bold">
          ${parseFloat(productData.price).toFixed(2)}
        </p>
        <AddToCartForm productSlug={productData.slug} />
      </div>
      <div className="pt-8">
        <Await promise={relatedPromise} fallback={null}>
          {(relatedProducts) => (
            <RelatedProducts
              relatedProducts={relatedProducts}
              currentSlug={productData.slug}
            />
          )}
        </Await>
      </div>
    </div>
  );
}

function RelatedProducts(props: {
  relatedProducts: Array<RelatedProduct>;
  currentSlug: string;
}) {
  const { relatedProducts } = props;
  const { category, subcategory } = Route.useParams();

  const currentProductIndex = relatedProducts.findIndex(
    (p) => p.slug === props.currentSlug,
  );
  const related = [
    ...relatedProducts.slice(currentProductIndex + 1),
    ...relatedProducts.slice(0, currentProductIndex),
  ];

  return (
    <>
      {related.length > 0 && (
        <h2 className="text-lg font-bold text-accent1">
          Explore more products
        </h2>
      )}
      <div className="flex flex-row flex-wrap gap-2">
        {related.map((product) => (
          <ProductLink
            key={product.name}
            loading="lazy"
            category_slug={category}
            subcategory_slug={subcategory}
            product={product}
            imageUrl={product.image_url}
          />
        ))}
      </div>
    </>
  );
}
