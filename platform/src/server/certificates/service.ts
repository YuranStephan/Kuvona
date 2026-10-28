import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db, Executor } from "../db/client";
import {
  certificates,
  courses,
  lessonProgress,
  lessons,
  quizAttempts,
  quizQuestions,
  users,
} from "../db/schema";
import { humanCode } from "../auth/tokens";
import { getActiveEnrollment } from "../enrollment/service";
import { isUniqueViolation } from "../errors";

export const CERTIFICATE_PASS_PERCENT = 70;

/** Rechecked every time: enrollment active, every current lesson completed, best score ≥ 70% when there is a quiz. */
export async function certificateEligibility(
  db: Executor,
  userId: string,
  courseId: string,
) {
  const enrollment = await getActiveEnrollment(db, userId, courseId);
  const [lessonCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));
  const [doneCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessons.courseId, courseId),
        isNotNull(lessonProgress.completedAt),
      ),
    );
  const [questionCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quizQuestions)
    .where(eq(quizQuestions.courseId, courseId));
  const [best] = await db
    .select({
      score: sql<number | null>`max(${quizAttempts.scorePercent})::int`,
    })
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.courseId, courseId)),
    );
  const total = lessonCount?.n ?? 0;
  const done = doneCount?.n ?? 0;
  const quizRequired = (questionCount?.n ?? 0) > 0;
  const bestScore = best?.score ?? null;
  const lessonsOk = total > 0 && done >= total;
  const quizOk = !quizRequired || (bestScore ?? 0) >= CERTIFICATE_PASS_PERCENT;
  return {
    enrolled: Boolean(enrollment),
    total,
    done,
    quizRequired,
    bestScore,
    eligible: Boolean(enrollment) && lessonsOk && quizOk,
  };
}

export async function issueCertificateIfEligible(
  db: Db,
  userId: string,
  courseId: string,
) {
  const eligibility = await certificateEligibility(db, userId, courseId);
  if (!eligibility.eligible) return null;
  const [existing] = await db
    .select()
    .from(certificates)
    .where(
      and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)),
    )
    .limit(1);
  if (existing && !existing.revokedAt) return existing;

  const [info] = await db
    .select({
      name: users.name,
      courseTitle: courses.title,
      instructorId: courses.instructorId,
    })
    .from(users)
    .innerJoin(courses, eq(courses.id, courseId))
    .where(eq(users.id, userId));
  const [instructor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, info!.instructorId));
  const snapshot = {
    recipientName: info!.name,
    courseTitle: info!.courseTitle,
    instructorName: instructor?.name ?? "",
    scorePercent: eligibility.bestScore,
  };
  if (existing) {
    // Re-earned after a revocation (e.g. refund then repurchase): reactivate with a fresh snapshot.
    const [row] = await db
      .update(certificates)
      .set({
        ...snapshot,
        issuedAt: new Date(),
        revokedAt: null,
        revokeReason: null,
      })
      .where(eq(certificates.id, existing.id))
      .returning();
    return row!;
  }
  for (let i = 0; i < 5; i++) {
    try {
      const [row] = await db
        .insert(certificates)
        .values({
          ...snapshot,
          userId,
          courseId,
          code: `KVC-${humanCode(4)}-${humanCode(4)}`,
        })
        .returning();
      return row!;
    } catch (error) {
      if (isUniqueViolation(error, "certificates_code_unique")) continue;
      if (isUniqueViolation(error, "certificates_user_course_unique")) {
        const [row] = await db
          .select()
          .from(certificates)
          .where(
            and(
              eq(certificates.userId, userId),
              eq(certificates.courseId, courseId),
            ),
          );
        return row!;
      }
      throw error;
    }
  }
  throw new Error("Não foi possível gerar o código do certificado.");
}

/** Public verification: only what a certificate shows on paper. */
export async function findCertificateByCode(db: Executor, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^KVC-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(normalized)) return null;
  const [row] = await db
    .select({
      code: certificates.code,
      recipientName: certificates.recipientName,
      courseTitle: certificates.courseTitle,
      instructorName: certificates.instructorName,
      scorePercent: certificates.scorePercent,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
      revokeReason: certificates.revokeReason,
      userId: certificates.userId,
      courseId: certificates.courseId,
      courseSlug: courses.slug,
      durationSeconds: sql<number>`(SELECT coalesce(sum(duration_seconds), 0)::int FROM lessons WHERE course_id = ${certificates.courseId})`,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.code, normalized))
    .limit(1);
  if (!row) return null;
  // Public verification must use today's access and curriculum, as the classroom does.
  const eligibility = await certificateEligibility(
    db,
    row.userId,
    row.courseId,
  );
  return { ...row, eligible: !row.revokedAt && eligibility.eligible };
}

export async function listCertificates(db: Executor, userId: string) {
  return db
    .select({
      code: certificates.code,
      courseTitle: certificates.courseTitle,
      issuedAt: certificates.issuedAt,
      courseSlug: courses.slug,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(and(eq(certificates.userId, userId), isNull(certificates.revokedAt)))
    .orderBy(desc(certificates.issuedAt));
}
