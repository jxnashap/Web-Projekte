// Sitzungscookie (signiertes JWT). Vorschau-Login bis Supabase Auth angebunden ist.
import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "scm_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET ?? "nur-fuer-die-lokale-vorschau-bitte-in-produktion-setzen";
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET fehlt");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
