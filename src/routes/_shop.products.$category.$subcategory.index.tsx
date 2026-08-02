import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop/products/$category/$subcategory/")({
  component: () => <div />,
});
