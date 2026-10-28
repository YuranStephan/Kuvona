import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { certificates, courses, enrollments, lessonProgress, orders, paymentEvents } from "@/server/db/schema";
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  expireStaleOrders,
  refundOrder,
  rejectOrder,
  submitManualPayment,
} from "@/server/payments/orders";
import { processSandboxWebhook, signPayload, simulateSandboxOutcome } from "@/server/payments/sandbox";
import { getActiveEnrollment } from "@/server/enrollment/service";
import { canTransition } from "@/server/payments/state";
import { createCourse, createTestDb, createUser } from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

async function setup(priceCents = 150_000) {
  const admin = await createUser(db, "admin");
  const instructor = await createUser(db, "instructor");
  const student = await createUser(db, "student");
  const { course, lessons } = await createCourse(db, instructor.id, { priceCents });
  return { admin, instructor, student, course, lessons };
}

const enrollmentCount = async (userId: string, courseId: string) =>
  (await db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))).length;

describe("state machine", () => {
  it("only allows documented transitions", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("awaiting_verification", "paid")).toBe(true);
    expect(canTransition("awaiting_verification", "expired")).toBe(false);
    expect(canTransition("failed", "paid")).toBe(false);
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(canTransition("paid", "refunded")).toBe(true);
  });
});

describe("orders", () => {
  it("snapshots the catalog price; later price changes do not alter the order", async () => {
    const { student, course } = await setup(150_000);
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    expect(order.amountCents).toBe(150_000);
    expect(order.currency).toBe("MZN");
    await db.update(courses).set({ priceCents: 1 }).where(eq(courses.id, course.id));
    const [stored] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(stored!.amountCents).toBe(150_000);
  });

  it("reuses the open order instead of creating duplicates, even under concurrency", async () => {
    const { student, course } = await setup();
    const results = await Promise.all([
      createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" }),
      createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" }),
      createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" }),
    ]);
    expect(new Set(results.map((r) => r.order.id)).size).toBe(1);
    const open = await db.select().from(orders).where(and(eq(orders.userId, student.id), eq(orders.courseId, course.id)));
    expect(open).toHaveLength(1);
  });

  it("refuses free, unpublished, already-owned courses and disabled providers", async () => {
    const { student, instructor } = await setup();
    const free = await createCourse(db, instructor.id, { priceCents: 0 });
    await expect(createOrder(db, { userId: student.id, courseId: free.course.id, provider: "manual_mpesa" })).rejects.toThrow(/gratuito/);
    const draft = await createCourse(db, instructor.id, { status: "draft" });
    await expect(createOrder(db, { userId: student.id, courseId: draft.course.id, provider: "manual_mpesa" })).rejects.toThrow(/não disponível/);
    const paid = await createCourse(db, instructor.id);
    await expect(createOrder(db, { userId: student.id, courseId: paid.course.id, provider: "manual_emola" })).rejects.toThrow(/não está disponível/);
  });

  it("never grants access while pending, awaiting verification, failed, cancelled or expired", async () => {
    const { student, course, admin } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();

    await submitManualPayment(db, { userId: student.id, orderId: order.id, transactionId: "ABC12345XY", phone: "84 123 4567" });
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();

    await rejectOrder(db, { orderId: order.id, actorId: admin.id, reason: "Não encontrado no extrato" });
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();

    const second = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await cancelOrder(db, { userId: student.id, orderId: second.order.id });
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();

    const third = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await db.update(orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(orders.id, third.order.id));
    expect(await expireStaleOrders(db)).toBeGreaterThanOrEqual(1);
    const [expired] = await db.select().from(orders).where(eq(orders.id, third.order.id));
    expect(expired!.status).toBe("expired");
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();
  });

  it("orders awaiting verification never expire on their own", async () => {
    const { student, course } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await submitManualPayment(db, { userId: student.id, orderId: order.id, transactionId: "WAIT000001", phone: "841234567" });
    await db.update(orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(orders.id, order.id));
    await expireStaleOrders(db);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.status).toBe("awaiting_verification");
  });

  it("confirmation grants exactly one enrollment and is idempotent", async () => {
    const { student, course, admin } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await submitManualPayment(db, { userId: student.id, orderId: order.id, transactionId: "IDEM000001", phone: "+258 84 123 4567" });
    const first = await confirmOrder(db, { orderId: order.id, actorId: admin.id });
    const second = await confirmOrder(db, { orderId: order.id, actorId: admin.id });
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(await enrollmentCount(student.id, course.id)).toBe(1);
    const paidEvents = await db.select().from(paymentEvents).where(and(eq(paymentEvents.orderId, order.id), eq(paymentEvents.type, "paid")));
    expect(paidEvents).toHaveLength(1);
    const enrollment = await getActiveEnrollment(db, student.id, course.id);
    expect(enrollment?.source).toBe("purchase");
    expect(enrollment?.orderId).toBe(order.id);
  });

  it("a wallet transaction ID can back only one order", async () => {
    const { student, course } = await setup();
    const other = await createUser(db, "student");
    const a = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    const b = await createOrder(db, { userId: other.id, courseId: course.id, provider: "manual_mpesa" });
    await submitManualPayment(db, { userId: student.id, orderId: a.order.id, transactionId: "SAME000001", phone: "841234567" });
    await expect(
      submitManualPayment(db, { userId: other.id, orderId: b.order.id, transactionId: "same000001", phone: "851234567" }),
    ).rejects.toThrow(/já foi usado/);
    const [row] = await db.select().from(orders).where(eq(orders.id, b.order.id));
    expect(row!.status).toBe("pending");
  });

  it("students cannot act on someone else's order", async () => {
    const { student, course } = await setup();
    const intruder = await createUser(db, "student");
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await expect(
      submitManualPayment(db, { userId: intruder.id, orderId: order.id, transactionId: "INTRUDE001", phone: "841234567" }),
    ).rejects.toThrow(/não encontrado/);
    await expect(cancelOrder(db, { userId: intruder.id, orderId: order.id })).rejects.toThrow(/não encontrado/);
  });

  it("validates transaction IDs and phone numbers", async () => {
    const { student, course } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await expect(submitManualPayment(db, { userId: student.id, orderId: order.id, transactionId: "<b>", phone: "841234567" })).rejects.toThrow(/ID da transação/);
    await expect(submitManualPayment(db, { userId: student.id, orderId: order.id, transactionId: "ABCDEF1234", phone: "12345" })).rejects.toThrow(/telemóvel/);
  });

  it("refund revokes purchase access and the certificate but keeps progress", async () => {
    const { student, course, admin, lessons } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await confirmOrder(db, { orderId: order.id, actorId: admin.id, providerReference: "REFUND0001" });
    await db.insert(lessonProgress).values({ userId: student.id, lessonId: lessons[0]!.id, courseId: course.id, completedAt: new Date() });
    await db.insert(certificates).values({
      code: "KVC-TEST-0001",
      userId: student.id,
      courseId: course.id,
      recipientName: "x",
      courseTitle: "y",
      instructorName: "z",
    });
    await expect(refundOrder(db, { orderId: order.id, actorId: admin.id, reason: "" })).rejects.toThrow(/motivo/);
    const result = await refundOrder(db, { orderId: order.id, actorId: admin.id, reason: "Reembolso M-Pesa pedido pelo estudante" });
    expect(result.revoked).toBe(true);
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();
    const [cert] = await db.select().from(certificates).where(eq(certificates.code, "KVC-TEST-0001"));
    expect(cert!.revokedAt).not.toBeNull();
    const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, student.id));
    expect(progress).toHaveLength(1);
    const again = await refundOrder(db, { orderId: order.id, actorId: admin.id, reason: "segunda vez" });
    expect(again.changed).toBe(false);
  });

  it("refund keeps access granted by staff (not by the refunded purchase)", async () => {
    const { student, course, admin } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await confirmOrder(db, { orderId: order.id, actorId: admin.id, providerReference: "GRANTKEEP1" });
    await db.update(enrollments).set({ source: "grant" }).where(eq(enrollments.userId, student.id));
    const result = await refundOrder(db, { orderId: order.id, actorId: admin.id, reason: "Bolsa atribuída depois" });
    expect(result.revoked).toBe(false);
    expect(await getActiveEnrollment(db, student.id, course.id)).not.toBeNull();
  });

  it("the payment ledger is append-only at the database level", async () => {
    const { student, course } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "manual_mpesa" });
    await expect(db.execute(sql`UPDATE payment_events SET type = 'x' WHERE order_id = ${order.id}`)).rejects.toThrow();
    await expect(db.execute(sql`DELETE FROM payment_events WHERE order_id = ${order.id}`)).rejects.toThrow();
  });

  it("the database rejects a non-positive amount even if code tried", async () => {
    const { student, course } = await setup();
    await expect(
      db.insert(orders).values({
        reference: "KV-ZERO00",
        userId: student.id,
        courseId: course.id,
        amountCents: 0,
        currency: "MZN",
        provider: "manual_mpesa",
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});

describe("sandbox provider (signed callbacks)", () => {
  it("rejects bad signatures and malformed payloads", async () => {
    const raw = JSON.stringify({ eventId: "evt-000001", reference: "KV-AAAAAA", outcome: "success", transactionId: "SBX000001", amountCents: 100, currency: "MZN" });
    expect((await processSandboxWebhook(db, raw, "0".repeat(64))).status).toBe(401);
    expect((await processSandboxWebhook(db, raw, null)).status).toBe(401);
    expect((await processSandboxWebhook(db, "{nope", signPayload("{nope"))).status).toBe(400);
  });

  it("a successful callback grants access once; a replay is harmless", async () => {
    const { student, course } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "sandbox" });
    const raw = JSON.stringify({ eventId: `evt-${order.id}`, reference: order.reference, outcome: "success", transactionId: "SBXREPLAY01", amountCents: order.amountCents, currency: "MZN" });
    const first = await processSandboxWebhook(db, raw, signPayload(raw));
    const replay = await processSandboxWebhook(db, raw, signPayload(raw));
    expect(first.body.result).toBe("paid");
    expect(replay.body.result).toBe("duplicate");
    expect(await enrollmentCount(student.id, course.id)).toBe(1);
  });

  it("an amount that does not match the order fails it without access", async () => {
    const { student, course } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "sandbox" });
    const raw = JSON.stringify({ eventId: `evt-mismatch-${order.id}`, reference: order.reference, outcome: "success", transactionId: "SBXMISMATCH", amountCents: 1, currency: "MZN" });
    const result = await processSandboxWebhook(db, raw, signPayload(raw));
    expect(result.body.result).toBe("amount_mismatch");
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.status).toBe("failed");
  });

  it("the simulator only works on the student's own sandbox order", async () => {
    const { student, course } = await setup();
    const intruder = await createUser(db, "student");
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "sandbox" });
    await expect(simulateSandboxOutcome(db, { orderId: order.id, userId: intruder.id, outcome: "success" })).rejects.toThrow();
    const declined = await simulateSandboxOutcome(db, { orderId: order.id, userId: student.id, outcome: "failed" });
    expect(declined.body.result).toBe("failed");
    expect(await getActiveEnrollment(db, student.id, course.id)).toBeNull();
  });

  it("staff cannot hand-confirm simulator orders", async () => {
    const { student, course, admin } = await setup();
    const { order } = await createOrder(db, { userId: student.id, courseId: course.id, provider: "sandbox" });
    await expect(confirmOrder(db, { orderId: order.id, actorId: admin.id, providerReference: "HANDCONF01" })).rejects.toThrow(/simulador/);
  });
});
