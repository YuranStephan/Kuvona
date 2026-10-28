import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Executor } from "./db/client";
import { settings } from "./db/schema";
import { contentDefaults } from "@/lib/content-defaults";

const wallet = z.object({
  number: z.string().trim().max(30).default(""),
  accountName: z.string().trim().max(80).default(""),
});

export const paymentSettingsSchema = z.object({
  mpesa: wallet.default({ number: "", accountName: "" }),
  emola: wallet.default({ number: "", accountName: "" }),
  instructions: z.string().trim().max(600).default(""),
  /** Hours a student has to pay and submit the transaction ID before the order expires. */
  orderTtlHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .default(48),
});
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export const schoolSettingsSchema = z.object({
  supportEmail: z.string().trim().max(200).default(""),
  supportPhone: z.string().trim().max(40).default(""),
  legalName: z.string().trim().max(120).default("Academia Kuvona"),
  nuit: z.string().trim().max(20).default(""),
  /** International format without "+" (e.g. 258841234567). Powers the floating WhatsApp button. */
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(
      z.string().regex(/^$|^\d{9,15}$/, {
        error: "Número de WhatsApp inválido (ex.: 258841234567).",
      }),
    )
    .default(""),
  whatsappGreeting: z
    .string()
    .trim()
    .max(300)
    .default("Olá Kuvona! Tenho uma dúvida sobre os cursos."),
});
export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;

/**
 * Partner strip on the home page. `isDemo` marks a pitch mock-up: the page then states the companies
 * are not confirmed partners. Hosted deployments start empty; only add real, confirmed partners there.
 */
export const partnersSettingsSchema = z.object({
  heading: z
    .string()
    .trim()
    .max(80)
    .default("Parceiros e empresas que confiam na Kuvona"),
  names: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
  isDemo: z.boolean().default(false),
});
export type PartnersSettings = z.infer<typeof partnersSettingsSchema>;

export const contentSettingsSchema = z.object({
  heroTitle: z
    .string()
    .trim()
    .min(4)
    .max(140, { error: "O título principal pode ter até 140 caracteres." })
    .default(contentDefaults.heroTitle),
  heroSubtitle: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .default(contentDefaults.heroSubtitle),
  homeFaq: z
    .array(
      z.object({
        q: z.string().trim().min(1).max(200),
        a: z.string().trim().min(1).max(1500),
      }),
    )
    .max(12)
    .default(contentDefaults.homeFaq),
  aboutTitle: z
    .string()
    .trim()
    .min(4)
    .max(160)
    .default(contentDefaults.aboutTitle),
  aboutIntro: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .default(contentDefaults.aboutIntro),
  aboutBody: z
    .string()
    .trim()
    .min(40)
    .max(20000)
    .default(contentDefaults.aboutBody),
  terms: z.string().trim().min(80).max(30000).default(contentDefaults.terms),
  privacy: z
    .string()
    .trim()
    .min(80)
    .max(30000)
    .default(contentDefaults.privacy),
  refunds: z
    .string()
    .trim()
    .min(80)
    .max(30000)
    .default(contentDefaults.refunds),
});
export type ContentSettings = z.infer<typeof contentSettingsSchema>;

const registry = {
  payments: paymentSettingsSchema,
  school: schoolSettingsSchema,
  partners: partnersSettingsSchema,
  content: contentSettingsSchema,
} as const;
type Registry = typeof registry;
export type SettingKey = keyof Registry;

export async function getSetting<K extends SettingKey>(
  db: Executor,
  key: K,
): Promise<z.infer<Registry[K]>> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  const parsed = registry[key].safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : registry[key].parse({})) as z.infer<
    Registry[K]
  >;
}

export async function setSetting<K extends SettingKey>(
  db: Executor,
  key: K,
  value: z.input<Registry[K]>,
  actorId: string | null,
) {
  const parsed = registry[key].parse(value);
  await db
    .insert(settings)
    .values({ key, value: parsed, updatedBy: actorId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: parsed, updatedBy: actorId, updatedAt: new Date() },
    });
  return parsed;
}
