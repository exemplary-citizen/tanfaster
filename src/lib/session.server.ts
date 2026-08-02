import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { users, type NewUser } from "~/db/schema";
import { getEnv } from "~/lib/env";

const key = new TextEncoder().encode(
  getEnv("AUTH_SECRET") ?? "insecure-dev-secret",
);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string,
) {
  return compare(plainTextPassword, hashedPassword);
}

type SessionData = {
  user: { id: number };
  expires: string;
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1 day from now")
    .sign(key);
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload as unknown as SessionData;
}

export async function getSession() {
  const session = getCookie("session");
  if (!session) return null;
  try {
    return await verifyToken(session);
  } catch {
    return null;
  }
}

export async function setSession(user: NewUser) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session: SessionData = {
    user: { id: user.id! },
    expires: expiresInOneDay.toISOString(),
  };
  const encryptedSession = await signToken(session);
  setCookie("session", encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearSession() {
  deleteCookie("session");
}

export async function getUser() {
  const sessionData = await getSession();
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== "number"
  ) {
    return null;
  }
  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionData.user.id))
    .limit(1);
  return rows[0] ?? null;
}
