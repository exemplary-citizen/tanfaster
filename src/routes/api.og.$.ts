import { createFileRoute } from "@tanstack/react-router";
import { imageUrl } from "~/lib/images";
import {
  getCategory,
  getProductDetails,
  getSubcategory,
} from "~/lib/queries";

// Satori + resvg-wasm OG images (1200x630 PNG), replacing next/og's edge
// ImageResponse. The wasm binary and font are fetched once per isolate and
// cached at module scope; any failure falls back to the static PNG.

const SIZE = { width: 1200, height: 630 };

let deps:
  | Promise<{
    satori: typeof import("satori").default;
    Resvg: typeof import("@resvg/resvg-wasm").Resvg;
    font: ArrayBuffer;
  }>
  | undefined;

function loadDeps() {
  deps ??= (async () => {
    const [satoriMod, resvgMod, fontRes] = await Promise.all([
      import("satori"),
      import("@resvg/resvg-wasm"),
      fetch(
        "https://unpkg.com/@fontsource/geist-sans@5.1.0/files/geist-sans-latin-700-normal.woff",
      ),
    ]);
    if (!fontRes.ok) throw new Error("font fetch failed");
    const wasmRes = await fetch(
      "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
    );
    if (!wasmRes.ok) throw new Error("wasm fetch failed");
    await resvgMod.initWasm(wasmRes);
    return {
      satori: satoriMod.default,
      Resvg: resvgMod.Resvg,
      font: await fontRes.arrayBuffer(),
    };
  })();
  deps.catch(() => {
    deps = undefined;
  });
  return deps;
}

type OgContent = {
  title: string;
  description: string;
  image: string | null;
};

async function resolveContent(
  segments: Array<string>,
): Promise<OgContent | null> {
  const [categorySlug, subcategorySlug, productSlug] = segments.map((s) =>
    decodeURIComponent(s),
  );
  if (productSlug) {
    const product = await getProductDetails(productSlug);
    if (!product) return null;
    return {
      title: product.name,
      description: product.description,
      image: product.image_url,
    };
  }
  if (subcategorySlug) {
    const subcategory = await getSubcategory(subcategorySlug);
    if (!subcategory) return null;
    return {
      title: subcategory.name,
      description:
        `Choose from our selection of ${subcategory.name}. In stock and ready to ship.`,
      image: subcategory.image_url,
    };
  }
  if (categorySlug) {
    const category = await getCategory(categorySlug);
    if (!category) return null;
    const examples = category.subcollections
      .flatMap((s) => s.subcategories)
      .slice(0, 2)
      .map((s) => s.name)
      .join(", ");
    return {
      title: category.name,
      description:
        `Choose from our selection of ${category.name}, including ${examples} and more. In stock and ready to ship.`,
      image: category.image_url,
    };
  }
  return null;
}

function markup(content: OgContent) {
  const children: Array<unknown> = [];
  if (content.image) {
    children.push({
      type: "img",
      props: {
        src: imageUrl(content.image, { width: 128 }),
        width: 200,
        height: 200,
        style: { marginBottom: 20, objectFit: "contain" },
      },
    });
  }
  children.push(
    {
      type: "h1",
      props: {
        style: {
          fontSize: 64,
          fontWeight: 700,
          color: "#333",
          marginBottom: 20,
          textAlign: "center",
        },
        children: content.title,
      },
    },
    {
      type: "div",
      props: {
        style: {
          fontSize: 24,
          color: "#333",
          textAlign: "center",
          padding: "0 60px",
        },
        children: content.description,
      },
    },
  );
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#fff",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
      children,
    },
  };
}

const FALLBACK = () =>
  new Response(null, {
    status: 302,
    headers: {
      location: "/opengraph-image.png",
      "cache-control": "public, s-maxage=3600",
    },
  });

export const Route = createFileRoute("/api/og/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const segments = splat.split("/").filter(Boolean);
        if (segments.length === 0 || segments.length > 3) {
          return FALLBACK();
        }
        try {
          const content = await resolveContent(segments);
          if (!content) {
            return new Response("not found", { status: 404 });
          }
          const { satori, Resvg, font } = await loadDeps();
          const svg = await satori(markup(content) as never, {
            ...SIZE,
            fonts: [{ name: "Geist", data: font, weight: 700 }],
          });
          const png = new Resvg(svg, {
            fitTo: { mode: "width", value: SIZE.width },
          })
            .render()
            .asPng();
          return new Response(new Uint8Array(png), {
            headers: {
              "content-type": "image/png",
              "cache-control": "public, s-maxage=86400",
              "deno-cache-tag": "og",
            },
          });
        } catch (err) {
          console.error("og generation failed:", err);
          return FALLBACK();
        }
      },
    },
  },
});
