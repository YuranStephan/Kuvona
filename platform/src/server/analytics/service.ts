import { sql } from "drizzle-orm";
import type { Executor } from "../db/client";
import { rowsOf } from "../catalog/queries";

/**
 * Metric definitions (shown in the UI next to each number):
 * - Receita confirmada: orders with status `paid`, excluding the simulator. Refunded orders are not revenue.
 * - Em verificação: orders where the student submitted a transaction ID and staff has not decided.
 * - Estudante ativo: had lesson activity in the last 30 days.
 * - Conclusão: active enrollments that have a valid certificate.
 */
const REAL = sql`provider <> 'sandbox'`;

export async function adminOverview(db: Executor) {
  const [totals] = rowsOf<{
    revenueCents: number;
    revenue30Cents: number;
    paidOrders: number;
    refundedCents: number;
    awaitingCount: number;
    awaitingCents: number;
    pendingCount: number;
    students: number;
    instructors: number;
    newUsers30: number;
    activeEnrollments: number;
    activeLearners30: number;
    certificates: number;
    publishedCourses: number;
    inReview: number;
    applications: number;
    sandboxPaidCents: number;
  }>(
    await db.execute(sql`SELECT
      (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'paid' AND ${REAL}) AS "revenueCents",
      (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'paid' AND ${REAL} AND paid_at > now() - interval '30 days') AS "revenue30Cents",
      (SELECT count(*)::int FROM orders WHERE status = 'paid' AND ${REAL}) AS "paidOrders",
      (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'refunded' AND ${REAL}) AS "refundedCents",
      (SELECT count(*)::int FROM orders WHERE status = 'awaiting_verification') AS "awaitingCount",
      (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'awaiting_verification') AS "awaitingCents",
      (SELECT count(*)::int FROM orders WHERE status = 'pending') AS "pendingCount",
      (SELECT count(*)::int FROM users WHERE role = 'student') AS "students",
      (SELECT count(*)::int FROM users WHERE role = 'instructor') AS "instructors",
      (SELECT count(*)::int FROM users WHERE created_at > now() - interval '30 days') AS "newUsers30",
      (SELECT count(*)::int FROM enrollments WHERE status = 'active') AS "activeEnrollments",
      (SELECT count(DISTINCT user_id)::int FROM lesson_progress WHERE updated_at > now() - interval '30 days') AS "activeLearners30",
      (SELECT count(*)::int FROM certificates WHERE revoked_at IS NULL) AS "certificates",
      (SELECT count(*)::int FROM courses WHERE status = 'published') AS "publishedCourses",
      (SELECT count(*)::int FROM courses WHERE status = 'in_review') AS "inReview",
      (SELECT count(*)::int FROM instructor_applications WHERE status = 'pending') AS "applications",
      (SELECT coalesce(sum(amount_cents), 0)::int FROM orders WHERE status = 'paid' AND provider = 'sandbox') AS "sandboxPaidCents"`),
  );
  return totals!;
}

/** Daily confirmed revenue and new enrollments for the last `days` days (Maputo time), zero-filled. */
export async function dailySeries(
  db: Executor,
  days: number,
  instructorId?: string,
) {
  const scope = instructorId
    ? sql`AND c.instructor_id = ${instructorId}`
    : sql``;
  return rowsOf<{ day: string; revenueCents: number; enrollments: number }>(
    await db.execute(sql`
      WITH d AS (
        SELECT generate_series(
          (now() AT TIME ZONE 'Africa/Maputo')::date - (${days - 1})::int,
          (now() AT TIME ZONE 'Africa/Maputo')::date,
          interval '1 day')::date AS day
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
        coalesce((SELECT sum(o.amount_cents) FROM orders o JOIN courses c ON c.id = o.course_id
          WHERE o.status = 'paid' AND o.provider <> 'sandbox' ${scope}
          AND (o.paid_at AT TIME ZONE 'Africa/Maputo')::date = d.day), 0)::int AS "revenueCents",
        coalesce((SELECT count(*) FROM enrollments e JOIN courses c ON c.id = e.course_id
          WHERE (e.granted_at AT TIME ZONE 'Africa/Maputo')::date = d.day ${scope}), 0)::int AS "enrollments"
      FROM d ORDER BY d.day`),
  );
}

export type CoursePerformance = {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceCents: number;
  currency: string;
  coverSeed: number;
  instructorName: string;
  students: number;
  revenueCents: number;
  paidOrders: number;
  avgProgress: number;
  completions: number;
  ratingAvg: number | null;
  ratingCount: number;
  openQuestions: number;
};

export async function coursePerformance(db: Executor, instructorId?: string) {
  const scope = instructorId
    ? sql`WHERE c.instructor_id = ${instructorId}`
    : sql``;
  return rowsOf<CoursePerformance>(
    await db.execute(sql`
      SELECT c.id, c.slug, c.title, c.status, c.price_cents AS "priceCents", c.currency, c.cover_seed AS "coverSeed", u.name AS "instructorName",
        (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS students,
        (SELECT coalesce(sum(o.amount_cents), 0)::int FROM orders o WHERE o.course_id = c.id AND o.status = 'paid' AND o.provider <> 'sandbox') AS "revenueCents",
        (SELECT count(*)::int FROM orders o WHERE o.course_id = c.id AND o.status = 'paid' AND o.provider <> 'sandbox') AS "paidOrders",
        coalesce((
          SELECT round(avg(per.pct))::int FROM (
            SELECT e.user_id, 100.0 * count(lp.completed_at) / nullif((SELECT count(*) FROM lessons l WHERE l.course_id = c.id), 0) AS pct
            FROM enrollments e
            LEFT JOIN lesson_progress lp ON lp.user_id = e.user_id AND lp.course_id = c.id AND lp.completed_at IS NOT NULL
            WHERE e.course_id = c.id AND e.status = 'active'
            GROUP BY e.user_id
          ) per), 0) AS "avgProgress",
        (SELECT count(*)::int FROM certificates ce WHERE ce.course_id = c.id AND ce.revoked_at IS NULL) AS completions,
        (SELECT round(avg(r.rating)::numeric, 1)::float FROM reviews r WHERE r.course_id = c.id AND r.hidden_at IS NULL) AS "ratingAvg",
        (SELECT count(*)::int FROM reviews r WHERE r.course_id = c.id AND r.hidden_at IS NULL) AS "ratingCount",
        (SELECT count(*)::int FROM questions q WHERE q.course_id = c.id
          AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.user_id = c.instructor_id)) AS "openQuestions"
      FROM courses c JOIN users u ON u.id = c.instructor_id
      ${scope}
      ORDER BY "revenueCents" DESC, students DESC, c.title`),
  );
}

/** Per-student progress in one course (the caller must already have checked the actor may see it). */
export async function courseStudents(db: Executor, courseId: string) {
  return rowsOf<{
    userId: string;
    name: string;
    email: string;
    source: string;
    grantedAt: Date;
    lastActivityAt: Date | null;
    completed: number;
    total: number;
    bestScore: number | null;
    certificateCode: string | null;
  }>(
    await db.execute(sql`
      SELECT u.id AS "userId", u.name, u.email, e.source, e.granted_at AS "grantedAt", e.last_activity_at AS "lastActivityAt",
        (SELECT count(*)::int FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
          WHERE lp.user_id = u.id AND l.course_id = ${courseId} AND lp.completed_at IS NOT NULL) AS completed,
        (SELECT count(*)::int FROM lessons l WHERE l.course_id = ${courseId}) AS total,
        (SELECT max(score_percent)::int FROM quiz_attempts qa WHERE qa.user_id = u.id AND qa.course_id = ${courseId}) AS "bestScore",
        (SELECT code FROM certificates ce WHERE ce.user_id = u.id AND ce.course_id = ${courseId} AND ce.revoked_at IS NULL) AS "certificateCode"
      FROM enrollments e JOIN users u ON u.id = e.user_id
      WHERE e.course_id = ${courseId} AND e.status = 'active'
      ORDER BY coalesce(e.last_activity_at, e.granted_at) DESC`),
  );
}

/** Where students stop: completion count per lesson, in course order. */
export async function lessonFunnel(db: Executor, courseId: string) {
  return rowsOf<{ lessonId: string; title: string; completions: number }>(
    await db.execute(sql`
      SELECT l.id AS "lessonId", l.title,
        (SELECT count(*)::int FROM lesson_progress lp JOIN enrollments e ON e.user_id = lp.user_id AND e.course_id = l.course_id AND e.status = 'active'
          WHERE lp.lesson_id = l.id AND lp.completed_at IS NOT NULL) AS completions
      FROM lessons l JOIN modules m ON m.id = l.module_id
      WHERE l.course_id = ${courseId}
      ORDER BY m.position, l.position`),
  );
}

export async function instructorTotals(db: Executor, instructorId: string) {
  const [row] = rowsOf<{
    students: number;
    revenueCents: number;
    revenue30Cents: number;
    courses: number;
    published: number;
    certificates: number;
    openQuestions: number;
    ratingAvg: number | null;
  }>(
    await db.execute(sql`SELECT
      (SELECT count(DISTINCT e.user_id)::int FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = ${instructorId} AND e.status = 'active') AS students,
      (SELECT coalesce(sum(o.amount_cents), 0)::int FROM orders o JOIN courses c ON c.id = o.course_id WHERE c.instructor_id = ${instructorId} AND o.status = 'paid' AND o.provider <> 'sandbox') AS "revenueCents",
      (SELECT coalesce(sum(o.amount_cents), 0)::int FROM orders o JOIN courses c ON c.id = o.course_id WHERE c.instructor_id = ${instructorId} AND o.status = 'paid' AND o.provider <> 'sandbox' AND o.paid_at > now() - interval '30 days') AS "revenue30Cents",
      (SELECT count(*)::int FROM courses WHERE instructor_id = ${instructorId}) AS courses,
      (SELECT count(*)::int FROM courses WHERE instructor_id = ${instructorId} AND status = 'published') AS published,
      (SELECT count(*)::int FROM certificates ce JOIN courses c ON c.id = ce.course_id WHERE c.instructor_id = ${instructorId} AND ce.revoked_at IS NULL) AS certificates,
      (SELECT count(*)::int FROM questions q JOIN courses c ON c.id = q.course_id WHERE c.instructor_id = ${instructorId}
          AND NOT EXISTS (SELECT 1 FROM answers a JOIN users responder ON responder.id = a.user_id WHERE a.question_id = q.id AND (a.user_id = c.instructor_id OR responder.role = 'admin'))) AS "openQuestions",
      (SELECT round(avg(r.rating)::numeric, 1)::float FROM reviews r JOIN courses c ON c.id = r.course_id WHERE c.instructor_id = ${instructorId} AND r.hidden_at IS NULL) AS "ratingAvg"`),
  );
  return row!;
}

export async function recentSales(
  db: Executor,
  opts: { instructorId?: string; limit?: number } = {},
) {
  const scope = opts.instructorId
    ? sql`AND c.instructor_id = ${opts.instructorId}`
    : sql``;
  return rowsOf<{
    reference: string;
    amountCents: number;
    currency: string;
    paidAt: Date;
    courseTitle: string;
    studentName: string;
    provider: string;
  }>(
    await db.execute(sql`
      SELECT o.reference, o.amount_cents AS "amountCents", o.currency, o.paid_at AS "paidAt", c.title AS "courseTitle", u.name AS "studentName", o.provider
      FROM orders o JOIN courses c ON c.id = o.course_id JOIN users u ON u.id = o.user_id
      WHERE o.status = 'paid' ${scope}
      ORDER BY o.paid_at DESC LIMIT ${opts.limit ?? 8}`),
  );
}

export async function listUsers(
  db: Executor,
  opts: { q?: string; role?: string; limit?: number },
) {
  const conditions = [sql`TRUE`];
  if (opts.q) {
    const like = `%${opts.q.trim().toLowerCase()}%`;
    conditions.push(sql`(u.email LIKE ${like} OR lower(u.name) LIKE ${like})`);
  }
  if (opts.role && ["student", "instructor", "admin"].includes(opts.role))
    conditions.push(sql`u.role = ${opts.role}`);
  return rowsOf<{
    id: string;
    name: string;
    email: string;
    role: "student" | "instructor" | "admin";
    createdAt: Date;
    disabledAt: Date | null;
    emailVerifiedAt: Date | null;
    enrollments: number;
    spentCents: number;
    lastActivityAt: Date | null;
  }>(
    await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.created_at AS "createdAt", u.disabled_at AS "disabledAt", u.email_verified_at AS "emailVerifiedAt",
        (SELECT count(*)::int FROM enrollments e WHERE e.user_id = u.id AND e.status = 'active') AS enrollments,
        (SELECT coalesce(sum(amount_cents), 0)::int FROM orders o WHERE o.user_id = u.id AND o.status = 'paid' AND o.provider <> 'sandbox') AS "spentCents",
        (SELECT max(lp.updated_at) FROM lesson_progress lp WHERE lp.user_id = u.id) AS "lastActivityAt"
      FROM users u
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY u.created_at DESC
      LIMIT ${opts.limit ?? 200}`),
  );
}
