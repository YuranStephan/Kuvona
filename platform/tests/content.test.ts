import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import {
  contentSettingsSchema,
  getSetting,
  setSetting,
} from "@/server/settings";
import { createTestDb, createUser } from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

describe("editable site content", () => {
  it("has complete fallbacks without an initial settings row", async () => {
    const content = await getSetting(db, "content");
    expect(content.homeFaq.length).toBeGreaterThan(0);
    expect(content.refunds).toContain("[prazo a definir]");
    expect(content.terms.length).toBeGreaterThan(80);
  });

  it("persists admin copy without changing payment or school settings", async () => {
    const admin = await createUser(db, "admin");
    const payments = await getSetting(db, "payments");
    const initial = await getSetting(db, "content");
    await setSetting(
      db,
      "content",
      {
        ...initial,
        heroTitle: "Aprender para construir",
        homeFaq: [
          {
            q: "Como começar?",
            a: "Consulta o programa e a aula de pré-visualização.",
          },
        ],
      },
      admin.id,
    );
    expect((await getSetting(db, "content")).heroTitle).toBe(
      "Aprender para construir",
    );
    expect(await getSetting(db, "payments")).toEqual(payments);
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "content"));
    expect(row!.updatedBy).toBe(admin.id);
  });

  it("rejects incomplete policies and broken FAQ pairs", () => {
    expect(contentSettingsSchema.safeParse({ refunds: "" }).success).toBe(
      false,
    );
    expect(
      contentSettingsSchema.safeParse({ homeFaq: [{ q: "Pergunta?", a: "" }] })
        .success,
    ).toBe(false);
  });
});
