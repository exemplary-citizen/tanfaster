#!/usr/bin/env bash
# Restores NextFaster's 1M-product dump into the target Postgres.
# Usage: DATABASE_PUBLIC_URL=postgresql://... scripts/restore-db.sh
set -euo pipefail

: "${DATABASE_PUBLIC_URL:?set DATABASE_PUBLIC_URL to the target Postgres URL}"
DUMP="$(dirname "$0")/../data/data.sql"

if [ ! -f "$DUMP" ]; then
  echo "dump not found at $DUMP" >&2
  echo "download: curl -L -o data/data.zip https://media.githubusercontent.com/media/ethanniser/NextFaster/main/data/data.zip && (cd data && unzip data.zip)" >&2
  exit 1
fi

echo "== pre-creating roles the Neon dump references =="
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'default') THEN
    CREATE ROLE "default" NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cloud_admin') THEN
    CREATE ROLE cloud_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'neon_superuser') THEN
    CREATE ROLE neon_superuser NOLOGIN;
  END IF;
END
$$;
SQL

echo "== restoring $(du -h "$DUMP" | cut -f1) dump (10-40 min) =="
psql "$DATABASE_PUBLIC_URL" -q -v ON_ERROR_STOP=0 -f "$DUMP" 2>&1 |
  grep -E "ERROR" | sort | uniq -c || true

echo "== creating rate_limits table (ours, not in the dump) =="
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
SQL

echo "== verification =="
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -t <<'SQL'
SELECT 'products', count(*) FROM products;
SELECT 'categories', count(*) FROM categories;
SELECT 'subcategories', count(*) FROM subcategories;
SELECT 'pg_trgm', count(*) FROM pg_extension WHERE extname = 'pg_trgm';
SELECT 'gin indexes', count(*) FROM pg_indexes
  WHERE indexname IN ('name_search_index', 'name_trgm_index');
SELECT 'db size', pg_size_pretty(pg_database_size(current_database()));
SQL

PRODUCTS=$(psql "$DATABASE_PUBLIC_URL" -t -A -c "SELECT count(*) FROM products")
if [ "$PRODUCTS" -lt 1000000 ]; then
  echo "FAIL: expected >1M products, got $PRODUCTS" >&2
  exit 1
fi
echo "OK: $PRODUCTS products restored"
