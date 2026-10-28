import { and, eq, sql } from "drizzle-orm";
import type { Db, Executor } from "../db/client";
import { courses, enrollments, type Role } from "../db/schema";
import { audit } from "../audit";
import { DomainError, NotFoundError } from "../errors";

/**
 * The ONLY place that gives a student access to a course. Idempotent: an active enrollment is
 * left untouched; a revoked one is reactivated. Payment code must call this inside the same
 * transaction that marks the order paid.
 */
export async function grantEnrollment(
  tx: Executor,
  input: { userId: string; courseId: string; source: "purchase" | "free" | "grant"; orderId?: string | null },
) {
  const rows = await tx
    .insert(enrollments)
    .values({ userId: input.userId, courseId: input.courseId, source: input.source, orderId: input.orderId ?? null, status: "active" })
    .onConflictDoUpdate({
      target: [enrollments.userId, enrollments.courseId],
      set: { status: "active", source: input.source, orderId: input.orderId ?? null, grantedAt: new Date(), revokedAt: null },
      setWhere: sql`${enrollments.status} = 'revoked'`,
    })
    .returning({ id: enrollments.id });
  return { changed: rows.length > 0 };
}

export async function revokeEnrollment(tx: Executor, input: { userId: string; courseId: string }) {
  const rows = await tx
    .update(enrollments)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(enrollments.userId, input.userId), eq(enrollments.courseId, input.courseId), eq(enrollments.status, "active")))
    .returning({ id: enrollments.id });
  return { changed: rows.length > 0 };
}

export async function getActiveEnrollment(db: Executor, userId: string, courseId: string) {
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), eq(enrollments.status, "active")))
    .limit(1);
  return row ?? null;
}

export type Access = "admin" | "owner" | "enrolled" | null;

/** Who may open the full lessons of a course. Staff access is for editing/review, not a purchase. */
export async function courseAccess(
  db: Executor,
  user: { id: string; role: Role } | null,
  course: { id: string; instructorId: string },
): Promise<Access> {
  if (!user) return null;
  if (await getActiveEnrollment(db, user.id, course.id)) return "enrolled";
  if (course.instructorId === user.id) return "owner";
  if (user.role === "admin") return "admin";
  return null;
}

export async function enrollFree(db: Db, userId: string, courseId: string) {
  return db.transaction(async (tx) => {
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course || course.status !== "published") throw new NotFoundError("Curso não disponível.");
    if (course.priceCents !== 0) throw new DomainError("Este curso é pago. Conclui a compra para te inscreveres.", "not_free");
    const result = await grantEnrollment(tx, { userId, courseId, source: "free" });
    if (result.changed) await audit(tx, { actorId: userId, action: "enrollment.free", entityType: "course", entityId: courseId });
    return result;
  });
}

export async function touchEnrollmentActivity(db: Executor, userId: string, courseId: string) {
  await db
    .update(enrollments)
    .set({ lastActivityAt: new Date() })
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
}
