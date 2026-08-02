import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  headers: () => ({
    "cache-control": "public, max-age=0, s-maxage=60",
    "deno-cache-tag": "home",
  }),
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">TanFaster</h1>
      <p className="mt-4 text-gray-600">
        NextFaster ported to TanStack Start + Deno. Phase 0 smoke page.
      </p>
    </main>
  );
}
