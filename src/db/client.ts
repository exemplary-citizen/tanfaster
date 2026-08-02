import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "~/lib/env";
import * as schema from "./schema";

const url = getEnv("DATABASE_URL");
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

// prepare:false keeps the driver PgBouncer-compatible; small pool because
// Deno Deploy isolates scale out and each holds its own connections.
export const client = postgres(url, { prepare: false, max: 5 });

export const db = drizzle(client, { schema });
