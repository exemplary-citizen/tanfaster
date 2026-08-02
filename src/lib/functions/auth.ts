import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookies,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/client";
import { users, type NewUser } from "~/db/schema";
import { authRateLimit, signUpRateLimit } from "~/lib/rate-limit";
import {
  comparePasswords,
  getUser,
  hashPassword,
  setSession,
} from "~/lib/session.server";

const authSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AuthResult =
  | { error: string | { code: string; message: string } }
  | { success: true };

export const getUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getUser();
    return user ? { id: user.id, username: user.username } : null;
  },
);

export const signUpFn = createServerFn({ method: "POST" })
  .validator(authSchema)
  .handler(async ({ data }): Promise<AuthResult> => {
    const { username, password } = data;
    const ip = getRequestHeader("x-real-ip") ?? "local";
    const rl = await signUpRateLimit.limit(ip);
    if (!rl.success) {
      return {
        error: {
          code: "AUTH_ERROR",
          message: "Too many signups. Try again later",
        },
      };
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existingUser.length > 0) {
      return { error: "Username already taken. Please try again." };
    }

    const passwordHash = await hashPassword(password);
    const newUser: NewUser = { username, passwordHash };
    const [createdUser] = await db.insert(users).values(newUser).returning();
    if (!createdUser) {
      return { error: "Failed to create user. Please try again." };
    }
    await setSession(createdUser);
    return { success: true };
  });

export const signInFn = createServerFn({ method: "POST" })
  .validator(authSchema)
  .handler(async ({ data }): Promise<AuthResult> => {
    const { username, password } = data;
    const ip = getRequestHeader("x-real-ip") ?? "local";
    const rl = await authRateLimit.limit(ip);
    if (!rl.success) {
      return {
        error: {
          code: "AUTH_ERROR",
          message: "Too many attempts. Try again later",
        },
      };
    }

    const rows = await db
      .select({ user: users })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (rows.length === 0) {
      return { error: "Invalid username or password. Please try again." };
    }
    const foundUser = rows[0]!.user;

    const isPasswordValid = await comparePasswords(
      password,
      foundUser.passwordHash,
    );
    if (!isPasswordValid) {
      return { error: "Invalid username or password. Please try again." };
    }
    await setSession(foundUser);
    return { success: true };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const all = getCookies();
    for (const name of Object.keys(all)) {
      deleteCookie(name);
    }
  },
);
