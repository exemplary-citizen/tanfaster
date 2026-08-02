import { sql } from "drizzle-orm";
import { db } from "~/db/client";

// Fixed-window rate limiting in the shared Postgres — replaces the original's
// Upstash/Vercel KV sliding window. One atomic upsert per attempt; auth
// traffic is far too small for this to matter on the DB.
async function fixedWindowLimit(
  bucket: string,
  id: string,
  max: number,
  windowSeconds: number,
): Promise<{ success: boolean }> {
  const key = `${bucket}:${id}`;
  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN now() ELSE rate_limits.window_start END
    RETURNING count
  `);
  const rows = result as unknown as Array<{ count: number | string }>;
  const count = Number(rows[0]?.count ?? 0);
  return { success: count <= max };
}

export const authRateLimit = {
  limit: (ip: string) => fixedWindowLimit("auth", ip, 5, 15 * 60),
};

export const signUpRateLimit = {
  limit: (ip: string) => fixedWindowLimit("signup", ip, 1, 15 * 60),
};
