import { and, eq, sql } from "drizzle-orm";
import type { Db, Executor } from "../db/client";
import { courses, enrollments, orders, users, type Role } from "../db/schema";
import { audit } from "../audit";
import { deleteUserSessions } from "../auth/service";
import { grantEnrollment, revokeEnrollment } from "../enrollment/service";
import { DomainError, ForbiddenError, NotFoundError } from "../errors";

type Actor = { id: string; role: Role };

function requireAdmin(actor: Actor) {
  if (actor.role !== "admin") throw new ForbiddenError();
}

async function adminCount(db: Executor) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), sql`${users.disabledAt} IS NULL`));
  return row?.n ?? 0;
}

export async function changeRole(db: Db, actor: Actor, userId: string, role: Role) {
  requireAdmin(actor);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilizador não encontrado.");
  if (user.role === "admin" && role !== "admin" && (await adminCount(db)) <= 1) {
    throw new DomainError("Tem de existir pelo menos uma conta de gestão ativa.", "last_admin");
  }
  if (user.role === "instructor" && role === "student") {
    const [owned] = await db.select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.instructorId, userId));
    if ((owned?.n ?? 0) > 0) throw new DomainError("Este instrutor tem cursos. Reatribui-os antes de mudar o papel.", "has_courses");
  }
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  await audit(db, { actorId: actor.id, action: "user.role", entityType: "user", entityId: userId, data: { from: user.role, to: role } });
}

export async function setUserDisabled(db: Db, actor: Actor, userId: string, disabled: boolean) {
  requireAdmin(actor);
  if (userId === actor.id) throw new DomainError("Não podes desativar a tua própria conta.", "self");
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilizador não encontrado.");
  if (disabled && user.role === "admin" && (await adminCount(db)) <= 1) {
    throw new DomainError("Tem de existir pelo menos uma conta de gestão ativa.", "last_admin");
  }
  await db.update(users).set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() }).where(eq(users.id, userId));
  if (disabled) await deleteUserSessions(db, userId);
  await audit(db, { actorId: actor.id, action: disabled ? "user.disabled" : "user.enabled", entityType: "user", entityId: userId });
}

/** Staff-granted access (scholarship, partner, payment received outside the platform). Recorded in the audit log. */
export async function grantCourse(db: Db, actor: Actor, userId: string, courseId: string, reason: string) {
  requireAdmin(actor);
  const why = reason.trim().slice(0, 300);
  if (why.length < 5) throw new DomainError("Indica o motivo da concessão.", "missing_reason");
  return db.transaction(async (tx) => {
    const [course] = await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId));
    if (!course) throw new NotFoundError("Curso não encontrado.");
    const result = await grantEnrollment(tx, { userId, courseId, source: "grant" });
    await audit(tx, { actorId: actor.id, action: "enrollment.grant", entityType: "user", entityId: userId, data: { courseId, reason: why } });
    return result;
  });
}

export async function revokeCourse(db: Db, actor: Actor, userId: string, courseId: string, reason: string) {
  requireAdmin(actor);
  const why = reason.trim().slice(0, 300);
  if (why.length < 5) throw new DomainError("Indica o motivo.", "missing_reason");
  return db.transaction(async (tx) => {
    const [paid] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.courseId, courseId), eq(orders.status, "paid")));
    if (paid) throw new DomainError("Este acesso foi pago. Regista um reembolso no pedido em vez de revogar.", "paid_access");
    const result = await revokeEnrollment(tx, { userId, courseId });
    await audit(tx, { actorId: actor.id, action: "enrollment.revoke", entityType: "user", entityId: userId, data: { courseId, reason: why } });
    return result;
  });
}

export async function getUserDetail(db: Executor, userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      headline: users.headline,
      createdAt: users.createdAt,
      disabledAt: users.disabledAt,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;
  const access = await db
    .select({ courseId: courses.id, title: courses.title, slug: courses.slug, status: enrollments.status, source: enrollments.source, grantedAt: enrollments.grantedAt })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.userId, userId));
  const userOrders = await db
    .select({ id: orders.id, reference: orders.reference, status: orders.status, amountCents: orders.amountCents, currency: orders.currency, createdAt: orders.createdAt, courseTitle: courses.title })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .where(eq(orders.userId, userId))
    .orderBy(sql`${orders.createdAt} DESC`);
  return { user, access, orders: userOrders };
}
