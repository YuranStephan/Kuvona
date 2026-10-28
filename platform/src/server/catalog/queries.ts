import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { Executor } from "../db/client";
import {
  categories,
  courses,
  enrollments,
  lessons,
  modules,
  orders,
  reviews,
  users,
  wishlist,
  type Course,
  type CourseLevel,
  type Lesson,
  type Module,
  type Role,
} from "../db/schema";
import { courseAccess } from "../enrollment/service";

// ─── Shared building blocks ──────────────────────────────────────────────────

/** Accent-insensitive lower(): lets "programacao" match "Programação" without extensions. */
const fold = (expr: SQL | unknown) =>
  sql`translate(lower(${expr}), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')`;
const foldText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function lessonStats(db: Executor) {
  return db
    .select({
      courseId: lessons.courseId,
      lessonCount: sql<number>`count(*)::int`.as("lesson_count"),
      durationSeconds: sql<number>`coalesce(sum(${lessons.durationSeconds}), 0)::int`.as("duration_seconds"),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as("lesson_stats");
}

export function ratingStats(db: Executor) {
  return db
    .select({
      courseId: reviews.courseId,
      ratingAvg: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`.as("rating_avg"),
      ratingCount: sql<number>`count(*)::int`.as("rating_count"),
    })
    .from(reviews)
    .where(isNull(reviews.hiddenAt))
    .groupBy(reviews.courseId)
    .as("rating_stats");
}

export function enrollmentStats(db: Executor) {
  return db
    .select({
      courseId: enrollments.courseId,
      studentCount: sql<number>`count(*)::int`.as("student_count"),
    })
    .from(enrollments)
    .where(eq(enrollments.status, "active"))
    .groupBy(enrollments.courseId)
    .as("enrollment_stats");
}

export type CourseCard = Awaited<ReturnType<typeof cardQuery>>[number];

function cardQuery(db: Executor, where: SQL | undefined, order: SQL[], limit: number, offset = 0) {
  const ls = lessonStats(db);
  const rs = ratingStats(db);
  const es = enrollmentStats(db);
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      subtitle: courses.subtitle,
      level: courses.level,
      priceCents: courses.priceCents,
      currency: courses.currency,
      coverSeed: courses.coverSeed,
      featured: courses.featured,
      status: courses.status,
      publishedAt: courses.publishedAt,
      skills: courses.skills,
      categoryName: categories.name,
      categorySlug: categories.slug,
      instructorId: users.id,
      instructorName: users.name,
      lessonCount: sql<number>`coalesce(${ls.lessonCount}, 0)`,
      durationSeconds: sql<number>`coalesce(${ls.durationSeconds}, 0)`,
      ratingAvg: sql<number | null>`${rs.ratingAvg}`,
      ratingCount: sql<number>`coalesce(${rs.ratingCount}, 0)`,
      studentCount: sql<number>`coalesce(${es.studentCount}, 0)`,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.instructorId))
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(ls, eq(ls.courseId, courses.id))
    .leftJoin(rs, eq(rs.courseId, courses.id))
    .leftJoin(es, eq(es.courseId, courses.id))
    .where(where)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export type CatalogSort = "relevance" | "newest" | "price_asc" | "price_desc" | "rating" | "popular";
export type CatalogFilters = {
  q?: string;
  category?: string;
  level?: CourseLevel;
  price?: "free" | "paid";
  duration?: "short" | "medium" | "long";
  sort?: CatalogSort;
  page?: number;
};

export const PAGE_SIZE = 12;

export async function listCatalog(db: Executor, filters: CatalogFilters) {
  const ls = lessonStats(db);
  const conditions: SQL[] = [eq(courses.status, "published")];
  const q = filters.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${foldText(q)}%`;
    conditions.push(
      sql`(${fold(courses.title)} LIKE ${like} OR ${fold(courses.subtitle)} LIKE ${like} OR ${fold(courses.description)} LIKE ${like} OR ${fold(users.name)} LIKE ${like} OR ${fold(sql`${courses.skills}::text`)} LIKE ${like})`,
    );
  }
  if (filters.category) conditions.push(eq(categories.slug, filters.category));
  if (filters.level) conditions.push(eq(courses.level, filters.level));
  if (filters.price === "free") conditions.push(eq(courses.priceCents, 0));
  if (filters.price === "paid") conditions.push(sql`${courses.priceCents} > 0`);
  const duration = sql`coalesce(${ls.durationSeconds}, 0)`;
  if (filters.duration === "short") conditions.push(sql`${duration} < 3600`);
  if (filters.duration === "medium") conditions.push(sql`${duration} >= 3600 AND ${duration} < 4 * 3600`);
  if (filters.duration === "long") conditions.push(sql`${duration} >= 4 * 3600`);
  const where = and(...conditions);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.instructorId))
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(ls, eq(ls.courseId, courses.id))
    .where(where);

  const sortKey = filters.sort ?? (q ? "relevance" : "popular");
  const order: Record<CatalogSort, SQL[]> = {
    relevance: q ? [sql`CASE WHEN ${fold(courses.title)} LIKE ${`%${foldText(q)}%`} THEN 0 ELSE 1 END`, desc(courses.featured), desc(courses.publishedAt)] : [desc(courses.featured), desc(courses.publishedAt)],
    newest: [desc(courses.publishedAt)],
    price_asc: [asc(courses.priceCents), asc(courses.title)],
    price_desc: [desc(courses.priceCents), asc(courses.title)],
    rating: [sql`rating_avg DESC NULLS LAST`, sql`rating_count DESC NULLS LAST`],
    popular: [sql`student_count DESC NULLS LAST`, desc(courses.featured), desc(courses.publishedAt)],
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pages);
  const items = await cardQuery(db, where, order[sortKey], PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { items, total, page, pages, sort: sortKey };
}

export async function listCourseCards(
  db: Executor,
  opts: { ids?: string[]; featured?: boolean; instructorId?: string; categorySlug?: string; limit?: number; excludeId?: string; sort?: "newest" | "popular" },
) {
  const conditions: SQL[] = [eq(courses.status, "published")];
  if (opts.ids) {
    if (!opts.ids.length) return [];
    conditions.push(inArray(courses.id, opts.ids));
  }
  if (opts.featured) conditions.push(eq(courses.featured, true));
  if (opts.instructorId) conditions.push(eq(courses.instructorId, opts.instructorId));
  if (opts.categorySlug) conditions.push(eq(categories.slug, opts.categorySlug));
  if (opts.excludeId) conditions.push(sql`${courses.id} <> ${opts.excludeId}`);
  const order = opts.sort === "newest" ? [desc(courses.publishedAt)] : [sql`student_count DESC NULLS LAST`, desc(courses.featured), desc(courses.publishedAt)];
  return cardQuery(db, and(...conditions), order, opts.limit ?? 12);
}

export async function listCategories(db: Executor) {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      courseCount: sql<number>`(SELECT count(*)::int FROM courses c WHERE c.category_id = "categories"."id" AND c.status = 'published')`,
    })
    .from(categories)
    .orderBy(categories.position, categories.name);
}

export async function platformStats(db: Executor) {
  const [row] = await db
    .select({
      courses: sql<number>`(SELECT count(*)::int FROM ${courses} WHERE ${courses.status} = 'published')`,
      lessons: sql<number>`(SELECT count(*)::int FROM ${lessons} l JOIN ${courses} c ON c.id = l.course_id WHERE c.status = 'published')`,
      instructors: sql<number>`(SELECT count(DISTINCT ${courses.instructorId})::int FROM ${courses} WHERE ${courses.status} = 'published')`,
      freeCourses: sql<number>`(SELECT count(*)::int FROM ${courses} WHERE ${courses.status} = 'published' AND ${courses.priceCents} = 0)`,
    })
    .from(sql`(SELECT 1) AS one`);
  return row!;
}

// ─── Course detail ───────────────────────────────────────────────────────────

export type OutlineModule = Module & { lessons: Lesson[] };

export async function getOutline(db: Executor, courseId: string): Promise<OutlineModule[]> {
  const mods = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(modules.position, modules.title);
  const less = await db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(lessons.position, lessons.createdAt);
  return mods.map((m) => ({ ...m, lessons: less.filter((l) => l.moduleId === m.id) }));
}

export const flattenOutline = (outline: OutlineModule[]) => outline.flatMap((m) => m.lessons);

/** Strips everything a visitor without access must not receive: video IDs and full lesson bodies. */
export function publicOutline(outline: OutlineModule[]) {
  return outline.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      summary: l.summary,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      hasVideo: Boolean(l.youtubeVideoId),
    })),
  }));
}

export type Viewer = { id: string; role: Role } | null;

export async function getCourseDetail(db: Executor, slug: string, viewer: Viewer) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course) return null;
  const canPreviewUnpublished = viewer && (viewer.role === "admin" || viewer.id === course.instructorId);
  if (course.status !== "published" && !canPreviewUnpublished) return null;

  const [instructor] = await db
    .select({ id: users.id, name: users.name, headline: users.headline, bio: users.bio })
    .from(users)
    .where(eq(users.id, course.instructorId));
  const [category] = course.categoryId ? await db.select().from(categories).where(eq(categories.id, course.categoryId)) : [];
  const outline = await getOutline(db, course.id);
  const flat = flattenOutline(outline);
  const [stats] = await cardQuery(db, eq(courses.id, course.id), [], 1);
  const courseReviews = await db
    .select({ id: reviews.id, rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt, userName: users.name, userId: users.id })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.courseId, course.id), isNull(reviews.hiddenAt)))
    .orderBy(desc(reviews.createdAt))
    .limit(30);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: courseReviews.filter((r) => r.rating === stars).length }));
  const instructorStats = await instructorPublicStats(db, course.instructorId);

  let viewerState = {
    access: null as Awaited<ReturnType<typeof courseAccess>>,
    wishlisted: false,
    openOrderReference: null as string | null,
    completedLessons: 0,
    myReview: null as { rating: number; body: string } | null,
  };
  if (viewer) {
    const access = await courseAccess(db, viewer, course);
    const [wish] = await db.select().from(wishlist).where(and(eq(wishlist.userId, viewer.id), eq(wishlist.courseId, course.id)));
    const [open] = await db
      .select({ reference: orders.reference })
      .from(orders)
      .where(and(eq(orders.userId, viewer.id), eq(orders.courseId, course.id), inArray(orders.status, ["pending", "awaiting_verification"])))
      .limit(1);
    const [done] = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM lesson_progress WHERE user_id = ${viewer.id} AND course_id = ${course.id} AND completed_at IS NOT NULL`,
    ).then((r) => rowsOf<{ n: number }>(r));
    const mine = courseReviews.find((r) => r.userId === viewer.id);
    viewerState = {
      access,
      wishlisted: Boolean(wish),
      openOrderReference: open?.reference ?? null,
      completedLessons: done?.n ?? 0,
      myReview: mine ? { rating: mine.rating, body: mine.body } : null,
    };
  }

  return {
    course: publicCourse(course),
    instructor: instructor!,
    instructorStats,
    category: category ?? null,
    outline: publicOutline(outline),
    previewLessonIds: flat.filter((l) => l.isPreview && l.youtubeVideoId).map((l) => l.id),
    stats: {
      lessonCount: flat.length,
      durationSeconds: flat.reduce((s, l) => s + l.durationSeconds, 0),
      videoCount: flat.filter((l) => l.youtubeVideoId).length,
      ratingAvg: stats?.ratingAvg ?? null,
      ratingCount: stats?.ratingCount ?? 0,
      studentCount: stats?.studentCount ?? 0,
    },
    reviews: courseReviews.map(({ userId: _userId, ...r }) => r),
    distribution,
    viewer: viewerState,
  };
}

function publicCourse(course: Course) {
  const { reviewNote: _reviewNote, ...rest } = course;
  return rest;
}

/** Drizzle drivers disagree on the shape of raw results; this normalises both. */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export async function getPreviewLesson(db: Executor, slug: string, lessonId: string) {
  const [row] = await db
    .select({ lesson: lessons, courseTitle: courses.title, courseSlug: courses.slug })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(and(eq(courses.slug, slug), eq(lessons.id, lessonId), eq(lessons.isPreview, true), eq(courses.status, "published")))
    .limit(1);
  return row ?? null;
}

// ─── Instructors ─────────────────────────────────────────────────────────────

export async function instructorPublicStats(db: Executor, instructorId: string) {
  const [row] = await db.execute(
    sql`SELECT
      (SELECT count(*)::int FROM courses WHERE instructor_id = ${instructorId} AND status = 'published') AS courses,
      (SELECT count(DISTINCT e.user_id)::int FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = ${instructorId} AND e.status = 'active') AS students,
      (SELECT count(*)::int FROM reviews r JOIN courses c ON c.id = r.course_id WHERE c.instructor_id = ${instructorId} AND r.hidden_at IS NULL) AS reviews,
      (SELECT round(avg(r.rating)::numeric, 1)::float FROM reviews r JOIN courses c ON c.id = r.course_id WHERE c.instructor_id = ${instructorId} AND r.hidden_at IS NULL) AS rating`,
  ).then((r) => rowsOf<{ courses: number; students: number; reviews: number; rating: number | null }>(r));
  return row ?? { courses: 0, students: 0, reviews: 0, rating: null };
}

export async function getInstructorProfile(db: Executor, instructorId: string) {
  const [instructor] = await db
    .select({ id: users.id, name: users.name, headline: users.headline, bio: users.bio, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, instructorId))
    .limit(1);
  if (!instructor || instructor.role === "student") return null;
  const coursesList = await listCourseCards(db, { instructorId, limit: 50 });
  if (!coursesList.length && instructor.role !== "instructor") return null;
  return { instructor, courses: coursesList, stats: await instructorPublicStats(db, instructorId) };
}

export async function listWishlist(db: Executor, userId: string) {
  const rows = await db.select({ courseId: wishlist.courseId }).from(wishlist).where(eq(wishlist.userId, userId));
  return listCourseCards(db, { ids: rows.map((r) => r.courseId), limit: 100 });
}

export async function toggleWishlist(db: Executor, userId: string, courseId: string) {
  const removed = await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.courseId, courseId)))
    .returning();
  if (removed.length) return false;
  const [course] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id, courseId), eq(courses.status, "published")));
  if (!course) return false;
  await db.insert(wishlist).values({ userId, courseId }).onConflictDoNothing();
  return true;
}
