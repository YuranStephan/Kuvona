import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { authTokens, emailOutbox, sessions } from "@/server/db/schema";
import {
  authenticate,
  createSessionRecord,
  findSessionUser,
  registerSchema,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "@/server/auth/service";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { parseYouTubeId } from "@/lib/youtube";
import { safeNextPath } from "@/lib/text";
import { normalizeMzPhone, normalizeTransactionId } from "@/server/payments/state";
import { createTestDb } from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

describe("accounts and sessions", () => {
  it("hashes passwords and verifies them", async () => {
    const hash = await hashPassword("uma-palavra-segura");
    expect(hash).not.toContain("uma-palavra-segura");
    expect(await verifyPassword("uma-palavra-segura", hash)).toBe(true);
    expect(await verifyPassword("outra", hash)).toBe(false);
  });

  it("registers once per email regardless of case", async () => {
    const input = registerSchema.parse({ name: "Carla Nhaca", email: "Carla@Exemplo.co.mz", password: "segura-123" });
    expect(input.email).toBe("carla@exemplo.co.mz");
    await registerUser(db, input);
    await expect(registerUser(db, registerSchema.parse({ ...input, email: "CARLA@exemplo.co.mz" }))).rejects.toThrow(/Já existe/);
  });

  it("stores only a hash of the session token", async () => {
    const user = await registerUser(db, registerSchema.parse({ name: "Sessão", email: "sessao@exemplo.co.mz", password: "segura-123" }));
    const { token } = await createSessionRecord(db, user.id, "vitest");
    const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(rows[0]!.id).not.toBe(token);
    expect((await findSessionUser(db, token))?.user.email).toBe("sessao@exemplo.co.mz");
    expect(await findSessionUser(db, `${token}x`)).toBeNull();
  });

  it("locks an email after repeated failures", async () => {
    await registerUser(db, registerSchema.parse({ name: "Bloqueio", email: "bloqueio@exemplo.co.mz", password: "segura-123" }));
    for (let i = 0; i < 5; i++) {
      await expect(authenticate(db, { email: "bloqueio@exemplo.co.mz", password: "errada", ip: null })).rejects.toThrow(/incorretos/);
    }
    await expect(authenticate(db, { email: "bloqueio@exemplo.co.mz", password: "segura-123", ip: null })).rejects.toThrow(/Demasiadas/);
  });

  it("password reset tokens are single-use and end other sessions", async () => {
    const user = await registerUser(db, registerSchema.parse({ name: "Reset", email: "reset@exemplo.co.mz", password: "segura-123" }));
    const { token: sessionToken } = await createSessionRecord(db, user.id, null);
    await requestPasswordReset(db, "reset@exemplo.co.mz");
    const [mail] = await db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, "reset@exemplo.co.mz")).orderBy(emailOutbox.createdAt);
    const resetMail = (await db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, "reset@exemplo.co.mz"))).find((m) => m.text.includes("/redefinir/"));
    expect(mail).toBeTruthy();
    const resetToken = resetMail!.text.match(/\/redefinir\/([\w-]+)/)![1]!;
    await resetPassword(db, resetToken, "nova-palavra-1");
    expect(await findSessionUser(db, sessionToken)).toBeNull();
    await expect(resetPassword(db, resetToken, "outra-palavra-2")).rejects.toThrow(/inválido/);
    expect((await authenticate(db, { email: "reset@exemplo.co.mz", password: "nova-palavra-1", ip: null })).id).toBe(user.id);
    const stored = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
    expect(stored.every((t) => t.tokenHash !== resetToken)).toBe(true);
  });

  it("does not reveal whether an email exists on reset", async () => {
    await expect(requestPasswordReset(db, "ninguem@exemplo.co.mz")).resolves.toBeUndefined();
  });
});

describe("input helpers", () => {
  it("formats and parses money as integer centavos", () => {
    expect(formatMoney(150_000)).toBe("1 500 MT");
    expect(formatMoney(150_050)).toBe("1 500,50 MT");
    expect(parseMoneyToCents("1 500")).toBe(150_000);
    expect(parseMoneyToCents("1.500,50")).toBe(150_050);
    expect(parseMoneyToCents("1500.5")).toBe(150_050);
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(() => formatMoney(1.5)).toThrow();
  });

  it("accepts only YouTube IDs from allowed hosts", () => {
    expect(parseYouTubeId("Ejkb_YpuHWs")).toBe("Ejkb_YpuHWs");
    expect(parseYouTubeId("https://www.youtube.com/watch?v=Ejkb_YpuHWs&t=3")).toBe("Ejkb_YpuHWs");
    expect(parseYouTubeId("youtu.be/Ejkb_YpuHWs")).toBe("Ejkb_YpuHWs");
    expect(parseYouTubeId("https://youtube.com/shorts/Ejkb_YpuHWs")).toBe("Ejkb_YpuHWs");
    expect(parseYouTubeId("https://evil.com/watch?v=Ejkb_YpuHWs")).toBeNull();
    expect(parseYouTubeId("<script>")).toBeNull();
  });

  it("only allows same-site redirects after login", () => {
    expect(safeNextPath("/aprender")).toBe("/aprender");
    expect(safeNextPath("//evil.com")).toBe("/aprender");
    expect(safeNextPath("https://evil.com")).toBe("/aprender");
    expect(safeNextPath("/\\evil.com")).toBe("/aprender");
  });

  it("normalises Mozambican phones and transaction IDs", () => {
    expect(normalizeMzPhone("+258 84 123 4567")).toBe("841234567");
    expect(normalizeMzPhone("861234567")).toBe("861234567");
    expect(normalizeMzPhone("911234567")).toBeNull();
    expect(normalizeTransactionId(" 9ab c123xyz ")).toBe("9ABC123XYZ");
    expect(normalizeTransactionId("<x>")).toBeNull();
  });
});
