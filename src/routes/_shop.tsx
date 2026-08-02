import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getCollectionsFn } from "~/lib/functions/data";

export const Route = createFileRoute("/_shop")({
  loader: () => getCollectionsFn(),
  component: () => <Outlet />,
});
