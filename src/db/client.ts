import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "~/lib/env";
import * as schema from "./schema";

// Lazy init so the server (and DB-free routes like /api/ping) can boot
// without a database; the first query pays the connection setup instead.
// prepare:false keeps the driver PgBouncer-compatible; small pool because
// Deno Deploy isolates scale out and each holds its own connections.
function createDb() {
  const url = getEnv("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
}

let instance: ReturnType<typeof createDb> | undefined;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    instance ??= createDb();
    return Reflect.get(instance, prop as keyof typeof instance);
  },
});
