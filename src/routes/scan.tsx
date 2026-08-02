import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link } from "~/components/ui/link";

export const Route = createFileRoute("/scan")({
  ssr: false,
  headers: () => ({ "cache-control": "private, no-store" }),
  component: ScanPage,
});

// The original imports the `react-scan` npm package and calls
// `scan({ enabled: true })`. This project doesn't ship react-scan as a
// dependency, so we load its documented standalone build on mount instead —
// it auto-enables scanning as soon as the script executes.
const REACT_SCAN_SRC = "https://unpkg.com/react-scan/dist/auto.global.js";

function ScanPage() {
  useEffect(() => {
    if (document.querySelector(`script[src="${REACT_SCAN_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = REACT_SCAN_SRC;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <p className="mb-4 text-lg">
        React Scan has loaded, you can now start exploring the site
      </p>
      <Link href="/" className="text-blue-500 underline hover:text-blue-700">
        Back to home
      </Link>
    </div>
  );
}
