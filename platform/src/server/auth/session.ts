import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db/client";
import type { Role } from "../db/schema";
import { AuthError, ForbiddenError } from "../errors";
import { createSessionRecord, deleteSession, findSessionUser, type SessionUser } from "./service";

export const SESSION_COOKIE = "kv_session";

const readSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  return findSessionUser(await getDb(), token);
});

/** The signed-in user for this request, or null. Deduplicated per request. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await readSession())?.user ?? null;
}

export async function getCurrentSessionId() {
  return (await readSession())?.sessionId ?? null;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function startSession(userId: string) {
  const h = await headers();
  const { token, expiresAt } = await createSessionRecord(await getDb(), userId, h.get("user-agent"));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !(process.env.APP_URL ?? "").startsWith("http://"),
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(SESSION_COOKIE);
}

// ─── Page guards (redirect) ──────────────────────────────────────────────────

export async function requireUserPage(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireRolePage(roles: Role[], nextPath: string): Promise<SessionUser> {
  const user = await requireUserPage(nextPath);
  if (!roles.includes(user.role)) redirect("/sem-acesso");
  return user;
}

// ─── Action guards (throw) ───────────────────────────────────────────────────

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
