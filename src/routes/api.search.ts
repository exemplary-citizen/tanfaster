import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: () => Response.json({ results: [] }),
    },
  },
});
