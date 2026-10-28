import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { maskPhone } from "@/lib/text";
import { orderStatusLabel } from "@/lib/format";
import type { Db, Executor, Tx } from "../db/client";
import {
  certificates,
  courses,
  enrollments,
  orders,
  paymentEvents,
  users,
  type Order,
  type OrderStatus,
  type PaymentProviderId,
} from "../db/schema";
import { audit } from "../audit";
import { humanCode } from "../auth/tokens";
import { getActiveEnrollment, grantEnrollment, revokeEnrollment } from "../enrollment/service";
import { DomainError, NotFoundError, isUniqueViolation } from "../errors";
import { getSetting } from "../settings";
import { providerOption } from "./providers";
import {
  OPEN_STATUSES,
  SANDBOX_TTL_MS,
  canTransition,
  isManualProvider,
  normalizeMzPhone,
  normalizeTransactionId,
} from "./state";
import { notifyAdminsOfSubmission, notifyStudent } from "./notifications";

type NewOrderPatch = Partial<typeof orders.$inferInsert>;

async function lockOrder(tx: Tx, where: { id: string } | { reference: string }) {
  const condition = "id" in where ? eq(orders.id, where.id) : eq(orders.reference, where.reference);
  const [order] = await tx.select().from(orders).where(condition).for("update").limit(1);
  return order ?? null;
}

/** The single way an order changes status: checks the state machine, guards against races, writes the ledger. */
async function transition(
  tx: Tx,
  order: Order,
  to: OrderStatus,
  actorId: string | null,
  data: Record<string, unknown> = {},
  patch: NewOrderPatch = {},
) {
  if (!canTransition(order.status, to)) {
    throw new DomainError(
      `Não é possível passar de "${orderStatusLabel[order.status]}" para "${orderStatusLabel[to]}".`,
      "invalid_transition",
    );
  }
  const [updated] = await tx
    .update(orders)
    .set({ ...patch, status: to, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning();
  if (!updated) throw new DomainError("O pedido foi alterado entretanto. Atualiza a página.", "conflict");
  await tx.insert(paymentEvents).values({ orderId: order.id, type: to, fromStatus: order.status, toStatus: to, actorId, data });
  return updated;
}

function mapDuplicateReference(error: unknown): never {
  if (isUniqueViolation(error, "orders_provider_reference_unique")) {
    throw new DomainError(
      "Este ID de transação já foi usado noutro pedido. Confirma o código no SMS do pagamento.",
      "duplicate_reference",
    );
  }
  throw error;
}

// ─── Student actions ─────────────────────────────────────────────────────────

/**
 * Opens an order at the catalog price. Reuses the student's open order for the course when possible,
 * so double clicks and retries never create duplicate charges.
 */
export async function createOrder(db: Db, input: { userId: string; courseId: string; provider: PaymentProviderId }) {
  const settings = await getSetting(db, "payments");
  if (!providerOption(settings, input.provider)) {
    throw new DomainError("Este método de pagamento não está disponível.", "provider_unavailable");
  }
  await expireStaleOrders(db);

  const run = () =>
    db.transaction(async (tx) => {
      const [course] = await tx.select().from(courses).where(eq(courses.id, input.courseId)).limit(1);
      if (!course || course.status !== "published") throw new NotFoundError("Curso não disponível para compra.");
      if (course.priceCents <= 0) throw new DomainError("Este curso é gratuito: inscreve-te diretamente.", "free_course");
      if (await getActiveEnrollment(tx, input.userId, course.id)) {
        throw new DomainError("Já tens acesso a este curso.", "already_enrolled");
      }

      const [open] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.userId, input.userId), eq(orders.courseId, course.id), inArray(orders.status, [...OPEN_STATUSES])))
        .for("update")
        .limit(1);
      if (open) {
        if (open.status === "awaiting_verification" || open.provider === input.provider) return { order: open, reused: true };
        await transition(tx, open, "cancelled", input.userId, { reason: "method_changed" });
      }

      const ttl = input.provider === "sandbox" ? SANDBOX_TTL_MS : settings.orderTtlHours * 60 * 60 * 1000;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const order = await tx.transaction(async (sp) => {
            const [row] = await sp
              .insert(orders)
              .values({
                reference: `KV-${humanCode(6)}`,
                userId: input.userId,
                courseId: course.id,
                amountCents: course.priceCents,
                currency: course.currency,
                provider: input.provider,
                expiresAt: new Date(Date.now() + ttl),
              })
              .returning();
            return row!;
          });
          await tx.insert(paymentEvents).values({
            orderId: order.id,
            type: "created",
            toStatus: "pending",
            actorId: input.userId,
            data: { amountCents: order.amountCents, currency: order.currency, provider: order.provider },
          });
          return { order, reused: false };
        } catch (error) {
          if (isUniqueViolation(error, "orders_reference_unique")) continue;
          throw error;
        }
      }
      throw new Error("Não foi possível gerar uma referência única.");
    });

  try {
    return await run();
  } catch (error) {
    // Two simultaneous requests: the partial unique index lets only one open order through.
    if (isUniqueViolation(error, "orders_one_open_per_course")) return run();
    throw error;
  }
}

/** Student declares a manual wallet payment by giving the transaction ID from the confirmation SMS. */
export async function submitManualPayment(
  db: Db,
  input: { userId: string; orderId: string; transactionId: string; phone: string },
) {
  const transactionId = normalizeTransactionId(input.transactionId);
  if (!transactionId) throw new DomainError("Indica o ID da transação tal como aparece no SMS (letras e números).", "invalid_reference");
  const phone = normalizeMzPhone(input.phone);
  if (!phone) throw new DomainError("Indica o número de telemóvel usado no pagamento (ex.: 84 123 4567).", "invalid_phone");

  let updated: Order;
  try {
    updated = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, { id: input.orderId });
      if (!order || order.userId !== input.userId) throw new NotFoundError("Pedido não encontrado.");
      if (!isManualProvider(order.provider)) throw new DomainError("Este pedido não usa pagamento manual.", "wrong_provider");
      if (order.status === "awaiting_verification") throw new DomainError("Já enviaste os dados deste pagamento. Está em verificação.", "already_submitted");
      if (order.status !== "pending") throw new DomainError("Este pedido já não aceita pagamentos. Cria um novo pedido.", "closed");
      if (order.expiresAt < new Date()) throw new DomainError("Este pedido expirou. Volta ao curso para criar um novo.", "expired");
      return transition(
        tx,
        order,
        "awaiting_verification",
        input.userId,
        { transactionId, phone: maskPhone(phone) },
        { providerReference: transactionId, payerPhoneMasked: maskPhone(phone), submittedAt: new Date() },
      );
    });
  } catch (error) {
    mapDuplicateReference(error);
  }
  await notifyAdminsOfSubmission(db, updated);
  return updated;
}

export async function cancelOrder(db: Db, input: { userId: string; orderId: string }) {
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, { id: input.orderId });
    if (!order || order.userId !== input.userId) throw new NotFoundError("Pedido não encontrado.");
    if (order.status === "cancelled") return order;
    if (order.status !== "pending") throw new DomainError("Só podes cancelar um pedido que ainda aguarda pagamento.", "not_cancellable");
    return transition(tx, order, "cancelled", input.userId, { reason: "student" });
  });
}

// ─── Confirmation (staff verification or a verified provider event) ─────────

type Via = "staff" | "provider";

/** Inside an open transaction. Idempotent: confirming a paid order changes nothing. */
export async function confirmOrderInTx(
  tx: Tx,
  order: Order,
  input: { actorId: string | null; via: Via; providerReference?: string | null; data?: Record<string, unknown> },
) {
  if (order.status === "paid" || order.status === "refunded") return { order, changed: false };
  const reference = input.providerReference ? normalizeTransactionId(input.providerReference) : order.providerReference;
  if (!reference) throw new DomainError("Indica o ID da transação confirmado no extrato.", "missing_reference");
  const updated = await transition(
    tx,
    order,
    "paid",
    input.actorId,
    { via: input.via, providerReference: reference, ...input.data },
    { providerReference: reference, paidAt: new Date(), decidedBy: input.via === "staff" ? input.actorId : null },
  );
  await grantEnrollment(tx, { userId: order.userId, courseId: order.courseId, source: "purchase", orderId: order.id });
  await audit(tx, { actorId: input.actorId, action: "order.paid", entityType: "order", entityId: order.id, data: { via: input.via } });
  return { order: updated, changed: true };
}

export async function failOrderInTx(tx: Tx, order: Order, input: { actorId: string | null; reason: string; via: Via }) {
  if (order.status === "failed") return { order, changed: false };
  const updated = await transition(tx, order, "failed", input.actorId, { via: input.via, reason: input.reason }, {
    failureReason: input.reason,
    decidedBy: input.via === "staff" ? input.actorId : null,
  });
  return { order: updated, changed: true };
}

/** Staff confirms a payment after matching it against the wallet statement. */
export async function confirmOrder(db: Db, input: { orderId: string; actorId: string; providerReference?: string | null }) {
  let result: { order: Order; changed: boolean };
  try {
    result = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, { id: input.orderId });
      if (!order) throw new NotFoundError("Pedido não encontrado.");
      if (order.provider === "sandbox") throw new DomainError("Pedidos do simulador são decididos pelo simulador.", "wrong_provider");
      return confirmOrderInTx(tx, order, { actorId: input.actorId, via: "staff", providerReference: input.providerReference });
    });
  } catch (error) {
    mapDuplicateReference(error);
  }
  if (result.changed) await notifyStudent(db, result.order, "paid");
  return result;
}

export async function rejectOrder(db: Db, input: { orderId: string; actorId: string; reason: string }) {
  const reason = input.reason.trim().slice(0, 300);
  if (reason.length < 5) throw new DomainError("Explica ao estudante o motivo da recusa.", "missing_reason");
  const result = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, { id: input.orderId });
    if (!order) throw new NotFoundError("Pedido não encontrado.");
    return failOrderInTx(tx, order, { actorId: input.actorId, reason, via: "staff" });
  });
  if (result.changed) await notifyStudent(db, result.order, "failed");
  return result;
}

/**
 * Records a refund made outside the platform. Revokes purchase access unless another paid order
 * still backs it; progress is kept so a later purchase resumes where the student stopped.
 */
export async function refundOrder(db: Db, input: { orderId: string; actorId: string; reason: string }) {
  const reason = input.reason.trim().slice(0, 300);
  if (reason.length < 5) throw new DomainError("Indica o motivo e a forma do reembolso.", "missing_reason");
  const result = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, { id: input.orderId });
    if (!order) throw new NotFoundError("Pedido não encontrado.");
    if (order.status === "refunded") return { order, changed: false, revoked: false };
    const updated = await transition(tx, order, "refunded", input.actorId, { reason }, { refundedAt: new Date() });

    const [otherPaid] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, order.userId), eq(orders.courseId, order.courseId), eq(orders.status, "paid"), ne(orders.id, order.id)))
      .limit(1);
    const enrollment = await getActiveEnrollment(tx, order.userId, order.courseId);
    let revoked = false;
    if (!otherPaid && enrollment?.source === "purchase") {
      revoked = (await revokeEnrollment(tx, { userId: order.userId, courseId: order.courseId })).changed;
      await tx
        .update(certificates)
        .set({ revokedAt: new Date(), revokeReason: "Pagamento reembolsado" })
        .where(and(eq(certificates.userId, order.userId), eq(certificates.courseId, order.courseId), sql`${certificates.revokedAt} IS NULL`));
    }
    await audit(tx, { actorId: input.actorId, action: "order.refunded", entityType: "order", entityId: order.id, data: { reason, revoked } });
    return { order: updated, changed: true, revoked };
  });
  if (result.changed) await notifyStudent(db, result.order, "refunded");
  return result;
}

/** Pending orders past their deadline expire. Orders awaiting verification never expire automatically. */
export async function expireStaleOrders(db: Db) {
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(orders)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(orders.status, "pending"), lt(orders.expiresAt, new Date())))
      .returning({ id: orders.id });
    if (expired.length) {
      await tx
        .insert(paymentEvents)
        .values(expired.map((o) => ({ orderId: o.id, type: "expired", fromStatus: "pending" as const, toStatus: "expired" as const })));
    }
    return expired.length;
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const orderListColumns = {
  id: orders.id,
  reference: orders.reference,
  status: orders.status,
  provider: orders.provider,
  amountCents: orders.amountCents,
  currency: orders.currency,
  providerReference: orders.providerReference,
  payerPhoneMasked: orders.payerPhoneMasked,
  failureReason: orders.failureReason,
  createdAt: orders.createdAt,
  submittedAt: orders.submittedAt,
  paidAt: orders.paidAt,
  expiresAt: orders.expiresAt,
  courseId: courses.id,
  courseSlug: courses.slug,
  courseTitle: courses.title,
  courseCoverSeed: courses.coverSeed,
};

export async function getOrderForStudent(db: Executor, reference: string, userId: string) {
  const [row] = await db
    .select(orderListColumns)
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .where(and(eq(orders.reference, reference), eq(orders.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function listOrdersForStudent(db: Executor, userId: string) {
  return db
    .select(orderListColumns)
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function listOrdersForStaff(
  db: Executor,
  filter: { status?: OrderStatus | "open"; provider?: PaymentProviderId; q?: string; limit?: number },
) {
  const conditions = [];
  if (filter.status === "open") conditions.push(inArray(orders.status, [...OPEN_STATUSES]));
  else if (filter.status) conditions.push(eq(orders.status, filter.status));
  if (filter.provider) conditions.push(eq(orders.provider, filter.provider));
  if (filter.q) {
    const q = `%${filter.q.trim().toLowerCase()}%`;
    conditions.push(
      sql`(lower(${orders.reference}) LIKE ${q} OR lower(coalesce(${orders.providerReference}, '')) LIKE ${q} OR ${users.email} LIKE ${q} OR lower(${users.name}) LIKE ${q})`,
    );
  }
  return db
    .select({ ...orderListColumns, userId: users.id, userName: users.name, userEmail: users.email })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`CASE WHEN ${orders.status} = 'awaiting_verification' THEN 0 ELSE 1 END`, desc(orders.createdAt))
    .limit(filter.limit ?? 200);
}

export async function getOrderDetailForStaff(db: Executor, orderId: string) {
  const [order] = await db
    .select({ ...orderListColumns, userId: users.id, userName: users.name, userEmail: users.email, refundedAt: orders.refundedAt })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return null;
  const events = await db
    .select({
      id: paymentEvents.id,
      type: paymentEvents.type,
      fromStatus: paymentEvents.fromStatus,
      toStatus: paymentEvents.toStatus,
      data: paymentEvents.data,
      createdAt: paymentEvents.createdAt,
      actorName: users.name,
    })
    .from(paymentEvents)
    .leftJoin(users, eq(users.id, paymentEvents.actorId))
    .where(eq(paymentEvents.orderId, orderId))
    .orderBy(paymentEvents.id);
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, order.userId), eq(enrollments.courseId, order.courseId)))
    .limit(1);
  return { order, events, enrollment: enrollment ?? null };
}
