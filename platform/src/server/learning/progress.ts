import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Db, Executor } from "../db/client";
import { certificates, courses, enrollments, lessonProgress, lessons, notes, users, type Role } from "../db/schema";
import { courseAccess, touchEnrollmentActivity } from "../enrollment/service";
import { ForbiddenError, NotFoundError } from "../errors";
import { flattenOutline, getOutline, listCourseCards, rowsOf } from "../catalog/queries";

type Viewer = { id: string; role: Role };

/** Watching this share of a video counts as finishing it. */
export const COMPLETE_RATIO = 0.9;

export async function progressMap(db: Executor, userId: string, courseId: string) {
  const rows = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
  return new Map(rows.map((r) => [r.lessonId, r]));
}

/** Everything the classroom needs. Throws unless the viewer is enrolled, the instructor or staff. */
export async function getClassroom(db: Executor, viewer: Viewer, slug: string) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course) throw new NotFoundError("Curso não encontrado.");
  const access = await courseAccess(db, viewer, course);
  if (!access) throw new ForbiddenError("Ainda não tens acesso a este curso.");
  const outline = await getOutline(db, course.id);
  const flat = flattenOutline(outline);
  const progress = await progressMap(db, viewer.id, course.id);
  const completed = flat.filter((l) => progress.get(l.id)?.completedAt).length;
  const next = flat.find((l) => !progress.get(l.id)?.completedAt) ?? flat[0] ?? null;
  const [instructor] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, course.instructorId));
  return {
    course,
    access,
    instructor: instructor!,
    outline,
    flat,
    progress,
    completed,
    total: flat.length,
    percent: flat.length ? Math.round((completed / flat.length) * 100) : 0,
    nextLessonId: next?.id ?? null,
  };
}

export async function getLessonView(db: Executor, viewer: Viewer, slug: string, lessonId: string) {
  const classroom = await getClassroom(db, viewer, slug);
  const index = classroom.flat.findIndex((l) => l.id === lessonId);
  if (index < 0) throw new NotFoundError("Aula não encontrada.");
  const lesson = classroom.flat[index]!;
  const [note] = await db
    .select({ body: notes.body, updatedAt: notes.updatedAt })
    .from(notes)
    .where(and(eq(notes.userId, viewer.id), eq(notes.lessonId, lesson.id)));
  return {
    ...classroom,
    lesson,
    index,
    prev: classroom.flat[index - 1] ?? null,
    next: classroom.flat[index + 1] ?? null,
    lessonProgress: classroom.progress.get(lesson.id) ?? null,
    note: note ?? null,
  };
}

async function requireLessonAccess(db: Executor, viewer: Viewer, lessonId: string) {
  const [row] = await db
    .select({ lesson: lessons, instructorId: courses.instructorId })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) throw new NotFoundError("Aula não encontrada.");
  const access = await courseAccess(db, viewer, { id: row.lesson.courseId, instructorId: row.instructorId });
  if (!access) throw new ForbiddenError("Ainda não tens acesso a esta aula.");
  return { lesson: row.lesson, access };
}

/**
 * Player heartbeat. Position comes from the browser and is the student's own claim; it drives their
 * progress bar and resume point, never payments or access.
 */
export async function recordProgress(
  db: Db,
  viewer: Viewer,
  input: { lessonId: string; positionSeconds: number; durationSeconds: number; ended: boolean },
) {
  const { lesson } = await requireLessonAccess(db, viewer, input.lessonId);
  const position = Math.max(0, Math.min(Math.floor(input.positionSeconds), 24 * 3600));
  const duration = Math.max(0, Math.min(Math.floor(input.durationSeconds), 24 * 3600));
  const finished = input.ended || (duration > 30 && position / duration >= COMPLETE_RATIO);
  await db
    .insert(lessonProgress)
    .values({
      userId: viewer.id,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      positionSeconds: finished ? 0 : position,
      watchedSeconds: position,
      completedAt: finished ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        positionSeconds: finished ? 0 : position,
        watchedSeconds: sql`greatest(${lessonProgress.watchedSeconds}, ${position})`,
        completedAt: finished ? sql`coalesce(${lessonProgress.completedAt}, now())` : sql`${lessonProgress.completedAt}`,
        updatedAt: new Date(),
      },
    });
  if (lesson.durationSeconds === 0 && duration > 0) {
    // Fill in a missing duration from the real video length so course totals become accurate.
    await db.update(lessons).set({ durationSeconds: duration }).where(and(eq(lessons.id, lesson.id), eq(lessons.durationSeconds, 0)));
  }
  await touchEnrollmentActivity(db, viewer.id, lesson.courseId);
  return { completed: finished };
}

export async function setLessonCompleted(db: Db, viewer: Viewer, lessonId: string, completed: boolean) {
  const { lesson } = await requireLessonAccess(db, viewer, lessonId);
  await db
    .insert(lessonProgress)
    .values({ userId: viewer.id, lessonId: lesson.id, courseId: lesson.courseId, completedAt: completed ? new Date() : null })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { completedAt: completed ? sql`coalesce(${lessonProgress.completedAt}, now())` : null, updatedAt: new Date() },
    });
  await touchEnrollmentActivity(db, viewer.id, lesson.courseId);
  return lesson;
}

export async function saveNote(db: Db, viewer: Viewer, lessonId: string, body: string) {
  const { lesson } = await requireLessonAccess(db, viewer, lessonId);
  const text = body.slice(0, 20_000);
  if (!text.trim()) {
    await db.delete(notes).where(and(eq(notes.userId, viewer.id), eq(notes.lessonId, lesson.id)));
    return;
  }
  await db
    .insert(notes)
    .values({ userId: viewer.id, lessonId: lesson.id, courseId: lesson.courseId, body: text })
    .onConflictDoUpdate({ target: [notes.userId, notes.lessonId], set: { body: text, updatedAt: new Date() } });
}

export async function listNotes(db: Executor, userId: string) {
  const result = await db.execute(
    sql`SELECT n.body, n.updated_at AS "updatedAt", l.id AS "lessonId", l.title AS "lessonTitle", c.slug AS "courseSlug", c.title AS "courseTitle"
        FROM notes n JOIN lessons l ON l.id = n.lesson_id JOIN courses c ON c.id = n.course_id
        WHERE n.user_id = ${userId} ORDER BY n.updated_at DESC LIMIT 200`,
  );
  return rowsOf<{ body: string; updatedAt: Date; lessonId: string; lessonTitle: string; courseSlug: string; courseTitle: string }>(result);
}

/** The student's dashboard: active enrollments with progress, resume point and certificate. */
export async function myLearning(db: Executor, userId: string) {
  const rows = await db
    .select({ courseId: enrollments.courseId, grantedAt: enrollments.grantedAt, lastActivityAt: enrollments.lastActivityAt })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, "active")))
    .orderBy(desc(sql`coalesce(${enrollments.lastActivityAt}, ${enrollments.grantedAt})`));
  if (!rows.length) return [];
  const cards = await db
    .select()
    .from(courses)
    .where(sql`${courses.id} IN (${sql.join(rows.map((r) => sql`${r.courseId}`), sql`, `)})`);
  const cardInfo = await listCourseCards(db, { ids: rows.map((r) => r.courseId), limit: 200 });
  const done = await db
    .select({ courseId: lessonProgress.courseId, lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)));
  const certs = await db
    .select({ courseId: certificates.courseId, code: certificates.code })
    .from(certificates)
    .where(and(eq(certificates.userId, userId), sql`${certificates.revokedAt} IS NULL`));

  const result = [];
  for (const row of rows) {
    const course = cards.find((c) => c.id === row.courseId);
    if (!course) continue;
    const outline = await getOutline(db, course.id);
    const flat = flattenOutline(outline);
    const completedIds = new Set(done.filter((d) => d.courseId === course.id).map((d) => d.lessonId));
    const completed = flat.filter((l) => completedIds.has(l.id)).length;
    const next = flat.find((l) => !completedIds.has(l.id)) ?? null;
    const info = cardInfo.find((c) => c.id === course.id);
    result.push({
      course,
      instructorName: info?.instructorName ?? "",
      categoryName: info?.categoryName ?? null,
      durationSeconds: flat.reduce((s, l) => s + l.durationSeconds, 0),
      total: flat.length,
      completed,
      percent: flat.length ? Math.round((completed / flat.length) * 100) : 0,
      nextLesson: next ? { id: next.id, title: next.title } : null,
      lastActivityAt: row.lastActivityAt,
      grantedAt: row.grantedAt,
      certificateCode: certs.find((c) => c.courseId === course.id)?.code ?? null,
    });
  }
  return result;
}
