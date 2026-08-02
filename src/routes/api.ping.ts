import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { ok: true, app: "tanfaster" },
          {
            headers: {
              "cache-control": "public, s-maxage=60",
              "deno-cache-tag": "ping",
            },
          },
        ),
    },
  },
});
