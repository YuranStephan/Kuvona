import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db, Executor } from "../db/client";
import { authTokens, loginAttempts, sessions, users, type Role, type User } from "../db/schema";
import { appUrl, composeEmail, sendEmail } from "../email";
import { AuthError, DomainError, isUniqueViolation } from "../errors";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./tokens";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 30;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "emailVerifiedAt" | "headline">;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Indica um email válido." }).max(200, { error: "Email demasiado longo." }));
export const passwordSchema = z
  .string()
  .min(8, { error: "A palavra-passe precisa de pelo menos 8 caracteres." })
  .max(200, { error: "A palavra-passe é demasiado longa." });
export const nameSchema = z.string().trim().min(2, { error: "Indica o teu nome." }).max(80, { error: "Nome demasiado longo." });

export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Indica a palavra-passe." }).max(200),
});

export async function registerUser(db: Db, input: z.infer<typeof registerSchema>, role: Role = "student") {
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db.insert(users).values({ name: input.name, email: input.email, passwordHash, role }).returning();
    await sendVerificationEmail(db, user!);
    return user!;
  } catch (error) {
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new DomainError("Já existe uma conta com este email. Inicia sessão ou recupera a palavra-passe.", "email_taken");
    }
    throw error;
  }
}

async function recentFailures(db: Db, column: typeof loginAttempts.email | typeof loginAttempts.ip, value: string) {
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(column, value), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return row?.n ?? 0;
}

export async function authenticate(db: Db, input: { email: string; password: string; ip: string | null }) {
  const lockedByEmail = (await recentFailures(db, loginAttempts.email, input.email)) >= MAX_FAILURES_PER_EMAIL;
  const lockedByIp = input.ip ? (await recentFailures(db, loginAttempts.ip, input.ip)) >= MAX_FAILURES_PER_IP : false;
  if (lockedByEmail || lockedByIp) {
    throw new AuthError("Demasiadas tentativas falhadas. Aguarda 15 minutos ou recupera a palavra-passe.", "rate_limited");
  }

  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  // Hash even when the account doesn't exist so response time doesn't reveal registered emails.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  const success = Boolean(user && ok && !user.disabledAt);
  await db.insert(loginAttempts).values({ email: input.email, ip: input.ip, success });
  if (!user || !ok) throw new AuthError("Email ou palavra-passe incorretos.", "invalid_credentials");
  if (user.disabledAt) throw new AuthError("Esta conta foi desativada. Contacta o apoio.", "disabled");
  return user;
}

export async function createSessionRecord(db: Executor, userId: string, userAgent: string | null) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) ?? null });
  return { token, expiresAt };
}

export async function findSessionUser(db: Executor, token: string): Promise<{ sessionId: string; user: SessionUser } | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      headline: users.headline,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), isNull(users.disabledAt)))
    .limit(1);
  if (!row) return null;
  const { sessionId, ...user } = row;
  return { sessionId, user };
}

export async function deleteSession(db: Executor, token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function deleteUserSessions(db: Executor, userId: string, exceptSessionId?: string) {
  await db
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId));
}

// ─── One-time tokens (email verification, password reset) ───────────────────

type TokenKind = "verify_email" | "reset_password";

async function issueToken(db: Executor, userId: string, kind: TokenKind, ttlMs: number) {
  const token = newToken();
  await db.insert(authTokens).values({ userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

/** Atomically marks a token used. Returns the user id, or throws when invalid, expired or already used. */
export async function consumeToken(db: Executor, kind: TokenKind, token: string) {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.kind, kind),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  if (!row) throw new DomainError("Este link é inválido, expirou ou já foi usado. Pede um novo.", "invalid_token");
  return row.userId;
}

export async function sendVerificationEmail(db: Executor, user: Pick<User, "id" | "email" | "name">) {
  const token = await issueToken(db, user.id, "verify_email", 3 * 24 * 60 * 60 * 1000);
  await sendEmail(
    db,
    composeEmail(user.email, "Confirma o teu email na Kuvona", {
      title: `Bem-vindo(a), ${user.name}`,
      paragraphs: ["A tua conta foi criada. Confirma o teu email para recebermos as tuas compras e certificados no endereço certo."],
      action: { label: "Confirmar email", url: `${appUrl()}/verificar-email/${token}` },
    }),
  );
}

export async function verifyEmail(db: Db, token: string) {
  return db.transaction(async (tx) => {
    const userId = await consumeToken(tx, "verify_email", token);
    await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
    return userId;
  });
}

/** Behaves the same whether or not the email exists, so accounts cannot be enumerated. */
export async function requestPasswordReset(db: Db, rawEmail: string) {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return;
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data)).limit(1);
  if (!user || user.disabledAt) return;
  const token = await issueToken(db, user.id, "reset_password", 60 * 60 * 1000);
  await sendEmail(
    db,
    composeEmail(user.email, "Redefinir a palavra-passe", {
      title: "Redefinir a tua palavra-passe",
      paragraphs: [
        `Olá ${user.name}, recebemos um pedido para redefinir a palavra-passe da tua conta.`,
        "O link é válido durante 1 hora e só pode ser usado uma vez. Se não fizeste este pedido, ignora este email.",
      ],
      action: { label: "Escolher nova palavra-passe", url: `${appUrl()}/redefinir/${token}` },
    }),
  );
}

export async function resetPassword(db: Db, token: string, newPassword: string) {
  const passwordHash = await hashPassword(passwordSchema.parse(newPassword));
  return db.transaction(async (tx) => {
    const userId = await consumeToken(tx, "reset_password", token);
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    await deleteUserSessions(tx, userId);
    return userId;
  });
}

export async function changePassword(db: Db, userId: string, current: string, next: string, keepSessionId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    throw new DomainError("A palavra-passe atual não está correta.", "invalid_credentials");
  }
  const passwordHash = await hashPassword(passwordSchema.parse(next));
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  await deleteUserSessions(db, userId, keepSessionId);
}
