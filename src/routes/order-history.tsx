import { createFileRoute } from "@tanstack/react-router";
import { getUserFn } from "~/lib/functions/auth";

export const Route = createFileRoute("/order-history")({
  ssr: false,
  loader: () => getUserFn(),
  headers: () => ({ "cache-control": "private, no-store" }),
  head: () => ({ meta: [{ title: "Order History | TanFaster" }] }),
  component: OrderHistoryPage,
});

function OrderHistoryPage() {
  const user = Route.useLoaderData();

  return (
    <main className="min-h-screen p-4">
      <h1 className="w-full border-b-2 border-accent1 text-left text-2xl text-accent1">
        Order History
      </h1>
      <div className="mx-auto flex max-w-md flex-col gap-4 text-black">
        {user ? (
          <div className="border-t border-gray-200 pt-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500">
                  <th className="w-1/2 pb-2">Product</th>
                  <th className="w-1/4 pb-2">Last Order Date</th>
                  <th className="w-1/4 pb-2">Purchase Order</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    You have no previous orders.
                    <br />
                    When you place an order, it will appear here.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-semibold text-black">
            Log in to view order history
          </p>
        )}
      </div>
    </main>
  );
}
