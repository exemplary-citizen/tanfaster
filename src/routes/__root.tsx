import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";
import { Toaster } from "sonner";
import { AuthWidget } from "~/components/auth-widget";
import { CartBadge } from "~/components/cart-badge";
import { SearchDropdownComponent } from "~/components/search-dropdown";
import { Link } from "~/components/ui/link";
import { WelcomeToast } from "~/components/welcome-toast";
import globalsCss from "~/styles/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TanFaster" },
      {
        name: "description",
        content: "A performant site built with TanStack Start on Deno",
      },
    ],
    links: [{ rel: "stylesheet", href: globalsCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center p-16 font-mono">
      <h1 className="text-2xl font-bold text-accent1">404</h1>
      <p className="mt-2">This page could not be found.</p>
      <Link href="/" className="mt-4 text-accent1 hover:underline">
        Back home
      </Link>
    </main>
  );
}

function RootComponent() {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col overflow-y-auto overflow-x-hidden antialiased">
        <div>
          <header className="fixed top-0 z-10 flex h-[90px] w-[100vw] flex-grow items-center justify-between border-b-2 border-accent2 bg-background p-2 pb-[4px] pt-2 sm:h-[70px] sm:flex-row sm:gap-4 sm:p-4 sm:pb-[4px] sm:pt-0">
            <div className="flex flex-grow flex-col">
              <div className="absolute right-2 top-2 flex justify-end pt-2 font-sans text-sm hover:underline sm:relative sm:right-0 sm:top-0">
                <AuthWidget />
              </div>
              <div className="flex w-full flex-col items-start justify-center sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                <Link
                  prefetch={true}
                  href="/"
                  className="text-4xl font-bold text-accent1"
                >
                  TanFaster
                </Link>
                <div className="items flex w-full flex-row items-center justify-between gap-4">
                  <div className="mx-0 flex-grow sm:mx-auto sm:flex-grow-0">
                    <SearchDropdownComponent />
                  </div>
                  <div className="flex flex-row justify-between space-x-4">
                    <div className="relative">
                      <Link
                        prefetch={true}
                        href="/order"
                        className="text-lg text-accent1 hover:underline"
                      >
                        ORDER
                      </Link>
                      <CartBadge />
                    </div>
                    <Link
                      prefetch={true}
                      href="/order-history"
                      className="hidden text-lg text-accent1 hover:underline md:block"
                    >
                      ORDER HISTORY
                    </Link>
                    <Link
                      prefetch={true}
                      href="/order-history"
                      aria-label="Order History"
                      className="block text-lg text-accent1 hover:underline md:hidden"
                    >
                      <MenuIcon />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="pt-[85px] sm:pt-[70px]">
            <Outlet />
          </div>
        </div>
        <footer className="fixed bottom-0 flex h-12 w-screen flex-col items-center justify-between space-y-2 border-t border-gray-400 bg-background px-4 font-sans text-[11px] sm:h-6 sm:flex-row sm:space-y-0">
          <div className="flex flex-wrap justify-center space-x-2 pt-2 sm:justify-start">
            <span className="hover:bg-accent2 hover:underline">Home</span>
            <span>|</span>
            <span className="hover:bg-accent2 hover:underline">FAQ</span>
            <span>|</span>
            <span className="hover:bg-accent2 hover:underline">Returns</span>
            <span>|</span>
            <span className="hover:bg-accent2 hover:underline">Careers</span>
            <span>|</span>
            <span className="hover:bg-accent2 hover:underline">Contact</span>
          </div>
          <div className="text-center sm:text-right">
            A port of{" "}
            <Link
              href="https://github.com/ethanniser/NextFaster"
              className="font-bold text-accent1 hover:underline"
              target="_blank"
            >
              NextFaster
            </Link>{" "}
            — see the{" "}
            <Link
              href="https://github.com/exemplary-citizen/tanfaster"
              className="font-bold text-accent1 hover:underline"
              target="_blank"
            >
              Source Code
            </Link>
          </div>
        </footer>
        <Toaster closeButton />
        <WelcomeToast />
        <Scripts />
      </body>
    </html>
  );
}
