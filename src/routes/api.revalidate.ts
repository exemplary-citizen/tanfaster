import { createFileRoute } from "@tanstack/react-router";
import { getEnv } from "~/lib/env";

type RevalidateBody = { secret?: string; tags?: unknown };

export const Route = createFileRoute("/api/revalidate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = getEnv("REVALIDATE_SECRET");
        const body = (await request.json().catch(() => null)) as
          | RevalidateBody
          | null;
        if (!secret || body?.secret !== secret) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const tags = Array.isArray(body.tags)
          ? body.tags.filter((t): t is string => typeof t === "string")
          : [];
        if (tags.length === 0) {
          return Response.json({ error: "no tags given" }, { status: 400 });
        }
        if (!getEnv("DENO_DEPLOYMENT_ID")) {
          return Response.json({
            purged: false,
            reason: "cache tag purge is only available on Deno Deploy",
          });
        }
        const res = await fetch("http://cache.localhost/invalidate/http", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tags }),
        });
        return Response.json({ purged: res.ok, tags }, {
          status: res.ok ? 200 : 502,
        });
      },
    },
  },
});
