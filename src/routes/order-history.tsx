import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/order-history")({
  ssr: false,
  component: () => <div />,
});
