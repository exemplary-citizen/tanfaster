"use client";
import { Link } from "~/components/ui/link";
import { Image } from "~/components/ui/image";
import { imageUrl } from "~/lib/images";
import type { Product } from "~/db/schema";
import { useEffect } from "react";

// Port of Next's getImageProps for the 48px product-grid thumb: same
// dimensions (48x48) and quality (65) as the original, resolved through our
// image URL helper. Returns the same `{ props }` shape callers destructure.
export function getProductLinkImageProps(
  imageUrlSrc: string,
  productName: string,
) {
  return {
    props: {
      width: 48,
      height: 48,
      src: imageUrl(imageUrlSrc, { width: 48, quality: 65 }),
      alt: `A small picture of ${productName}`,
      sizes: undefined as string | undefined,
      srcSet: undefined as string | undefined,
    },
  };
}

export function ProductLink(props: {
  imageUrl?: string | null;
  category_slug: string;
  subcategory_slug: string;
  loading: "eager" | "lazy";
  product: Product;
}) {
  const { category_slug, subcategory_slug, product, imageUrl: imgSrc } = props;

  // prefetch the main image for the product page, if this is too heavy
  // we could only prefetch the first few cards, then prefetch on hover
  // (original used next/image getImageProps at 256px / quality 80)
  const prefetchSrc = imageUrl(imgSrc ?? "/placeholder.svg?height=64&width=64", {
    width: 256,
    quality: 80,
  });
  useEffect(() => {
    try {
      const img = new window.Image();
      // Don't interfer with important requests
      img.fetchPriority = "low";
      // Don't block the main thread with prefetch images
      img.decoding = "async";
      img.src = prefetchSrc;
    } catch (e) {
      console.error("failed to preload", prefetchSrc, e);
    }
  }, [prefetchSrc]);
  return (
    <Link
      prefetch={true}
      className="group flex h-[130px] w-full flex-row border px-4 py-2 hover:bg-gray-100 sm:w-[250px]"
      href={`/products/${category_slug}/${subcategory_slug}/${product.slug}`}
    >
      <div className="py-2">
        <Image
          loading={props.loading}
          decoding="sync"
          src={imgSrc ?? "/placeholder.svg?height=48&width=48"}
          alt={`A small picture of ${product.name}`}
          width={48}
          height={48}
          quality={65}
          className="h-auto w-12 flex-shrink-0 object-cover"
        />
      </div>
      <div className="px-2" />
      <div className="h-26 flex flex-grow flex-col items-start py-2">
        <div className="text-sm font-medium text-gray-700 group-hover:underline">
          {product.name}
        </div>
        <p className="overflow-hidden text-xs">{product.description}</p>
      </div>
    </Link>
  );
}
