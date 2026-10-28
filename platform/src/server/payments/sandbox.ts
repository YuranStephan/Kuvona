import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { orders, paymentEvents, providerEvents, type Order } from "../db/schema";
import { humanCode } from "../auth/tokens";
import { sandboxEnabled, webhookSecret } from "../config";
import { DomainError, NotFoundError } from "../errors";
import { confirmOrderInTx, failOrderInTx } from "./orders";
import { notifyStudent } from "./notifications";

/**
 * The simulator follows the same path a real gateway would: a signed callback, verified and
 * deduplicated on the server, then applied in one transaction. Only enabled in local mode.
 */
const eventSchema = z.object({
  eventId: z.string().min(8).max(100),
  reference: z.string().regex(/^KV-[0-9A-Z]{6}$/),
  outcome: z.enum(["success", "failed"]),
  transactionId: z.string().min(6).max(30),
  amountCents: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export type SandboxEvent = z.infer<typeof eventSchema>;

export function signPayload(raw: string) {
  return createHmac("sha256", webhookSecret()).update(raw).digest("hex");
}

function validSignature(raw: string, signature: string | null) {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signPayload(raw), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type WebhookResult = { status: number; body: { ok: boolean; result: string } };

export async function processSandboxWebhook(db: Db, raw: string, signature: string | null): Promise<WebhookResult> {
  if (!sandboxEnabled()) return { status: 404, body: { ok: false, result: "disabled" } };
  if (!validSignature(raw, signature)) return { status: 401, body: { ok: false, result: "bad_signature" } };
  let event: SandboxEvent;
  try {
    event = eventSchema.parse(JSON.parse(raw));
  } catch {
    return { status: 400, body: { ok: false, result: "bad_payload" } };
  }

  const outcome = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(providerEvents)
      .values({ provider: "sandbox", eventId: event.eventId, payload: event })
      .onConflictDoNothing()
      .returning({ eventId: providerEvents.eventId });
    if (!inserted.length) return { result: "duplicate" as const };

    const [order] = await tx.select().from(orders).where(eq(orders.reference, event.reference)).for("update").limit(1);
    if (!order || order.provider !== "sandbox") return { result: "unknown_order" as const };
    await tx.update(providerEvents).set({ orderId: order.id }).where(eq(providerEvents.eventId, event.eventId));

    if (event.amountCents !== order.amountCents || event.currency !== order.currency) {
      await tx.insert(paymentEvents).values({ orderId: order.id, type: "amount_mismatch", data: { received: event } });
      if (order.status === "pending") {
        const failed = await failOrderInTx(tx, order, { actorId: null, reason: "Montante recebido não corresponde ao pedido", via: "provider" });
        return { result: "amount_mismatch" as const, order: failed.order, notify: "failed" as const };
      }
      return { result: "amount_mismatch" as const };
    }
    if (event.outcome === "success") {
      if (order.status !== "pending" && order.status !== "paid") return { result: "ignored" as const };
      const confirmed = await confirmOrderInTx(tx, order, {
        actorId: null,
        via: "provider",
        providerReference: event.transactionId,
        data: { eventId: event.eventId },
      });
      return { result: confirmed.changed ? ("paid" as const) : ("already_paid" as const), order: confirmed.order, notify: confirmed.changed ? ("paid" as const) : undefined };
    }
    if (order.status !== "pending") return { result: "ignored" as const };
    const failed = await failOrderInTx(tx, order, { actorId: null, reason: "Pagamento recusado no telemóvel", via: "provider" });
    return { result: "failed" as const, order: failed.order, notify: "failed" as const };
  });

  if ("notify" in outcome && outcome.notify && outcome.order) await notifyStudent(db, outcome.order as Order, outcome.notify);
  return { status: 200, body: { ok: true, result: outcome.result } };
}

/** Local-only stand-in for the student's phone: builds and signs the callback a gateway would send. */
export async function simulateSandboxOutcome(db: Db, input: { orderId: string; userId: string; outcome: "success" | "failed" }) {
  if (!sandboxEnabled()) throw new DomainError("O simulador está desativado neste ambiente.", "disabled");
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order || order.userId !== input.userId || order.provider !== "sandbox") throw new NotFoundError("Pedido não encontrado.");
  const raw = JSON.stringify({
    eventId: randomUUID(),
    reference: order.reference,
    outcome: input.outcome,
    transactionId: `SBX${humanCode(9)}`,
    amountCents: order.amountCents,
    currency: order.currency,
  } satisfies SandboxEvent);
  return processSandboxWebhook(db, raw, signPayload(raw));
}
