#!/usr/bin/env bash
# Local Lighthouse runs (PSI API quota substitute) using system Chrome.
# Usage: bench/lighthouse-local.sh [runs-per-page]
set -euo pipefail
RUNS="${1:-3}"
OUT="bench/out/lighthouse"
mkdir -p "$OUT"

SITES=(
  "vercel|https://next-faster.vercel.app"
  "railway|https://web-production-b437.up.railway.app"
  "denoDeploy|https://tanfaster-app.exemplary-citizen.deno.net"
)
PAGES=(
  "home|/"
  "product|/products/graphite-pencils/colored-pencils/basic-colors-set"
)

for site_entry in "${SITES[@]}"; do
  site="${site_entry%%|*}"; base="${site_entry#*|}"
  for page_entry in "${PAGES[@]}"; do
    page="${page_entry%%|*}"; path="${page_entry#*|}"
    for i in $(seq 1 "$RUNS"); do
      f="$OUT/${site}-${page}-${i}.json"
      npx --yes lighthouse@12 "${base}${path}" \
        --only-categories=performance \
        --output=json --output-path="$f" \
        --chrome-flags="--headless=new" \
        --quiet 2>/dev/null || echo "FAILED $site $page run $i"
      echo "done $site $page run $i"
    done
  done
done
echo "all lighthouse runs complete"
