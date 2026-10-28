import { and, asc, eq, gt, lt, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { slugify } from "@/lib/text";
import { parseYouTubeId } from "@/lib/youtube";
import type { Db, Executor } from "../db/client";
import {
  categories,
  courses,
  lessonProgress,
  lessons,
  modules,
  quizQuestions,
  users,
  type Course,
  type Role,
} from "../db/schema";
import { audit } from "../audit";
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  isUniqueViolation,
} from "../errors";
import { getOutline, rowsOf } from "./queries";

export type Actor = { id: string; role: Role };

const isStaff = (actor: Actor) => actor.role === "admin";

/** Loads a course the actor may edit: its instructor, or staff. */
export async function editableCourse(
  db: Executor,
  actor: Actor,
  courseId: string,
): Promise<Course> {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) throw new NotFoundError("Curso não encontrado.");
  if (course.instructorId !== actor.id && !isStaff(actor))
    throw new ForbiddenError("Só podes editar os teus próprios cursos.");
  if (actor.role === "student") throw new ForbiddenError();
  return course;
}

async function touch(db: Executor, courseId: string) {
  await db
    .update(courses)
    .set({ updatedAt: new Date() })
    .where(eq(courses.id, courseId));
}

async function uniqueSlug(db: Executor, base: string, ignoreId?: string) {
  const root = slugify(base) || "curso";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, candidate))
      .limit(1);
    if (!hit || hit.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// ─── Course ──────────────────────────────────────────────────────────────────

export async function createCourse(
  db: Db,
  actor: Actor,
  input: { title: string; instructorId?: string },
) {
  if (actor.role === "student")
    throw new ForbiddenError("Só instrutores podem criar cursos.");
  const title = input.title.trim();
  if (title.length < 4)
    throw new DomainError(
      "O título precisa de pelo menos 4 caracteres.",
      "invalid",
    );
  const instructorId =
    isStaff(actor) && input.instructorId ? input.instructorId : actor.id;
  const [course] = await db
    .insert(courses)
    .values({
      title: title.slice(0, 120),
      slug: await uniqueSlug(db, title),
      instructorId,
    })
    .returning();
  await db
    .insert(modules)
    .values({ courseId: course!.id, title: "Introdução", position: 0 });
  await audit(db, {
    actorId: actor.id,
    action: "course.created",
    entityType: "course",
    entityId: course!.id,
  });
  return course!;
}

const list = (max: number, itemMax = 200) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max);

export const courseDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, { error: "Título demasiado curto." })
    .max(120),
  subtitle: z.string().trim().max(200).default(""),
  description: z.string().trim().max(8000).default(""),
  categoryId: z.uuid().nullable().default(null),
  level: z.enum(["beginner", "intermediate", "advanced", "all"]),
  priceCents: z.number().int().min(0).max(100_000_000),
  coverSeed: z.number().int().min(0).max(2_147_483_647).optional(),
  trailerUrl: z.string().trim().max(300).default(""),
  outcomes: list(12),
  requirements: list(10),
  audience: list(10),
  skills: list(10, 40),
  project: z.string().trim().max(600).default(""),
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(1).max(200),
        a: z.string().trim().min(1).max(1000),
      }),
    )
    .max(12),
});

export async function updateCourseDetails(
  db: Db,
  actor: Actor,
  courseId: string,
  raw: z.input<typeof courseDetailsSchema>,
) {
  const course = await editableCourse(db, actor, courseId);
  const input = courseDetailsSchema.parse(raw);
  const trailerYoutubeId = input.trailerUrl
    ? parseYouTubeId(input.trailerUrl)
    : null;
  if (input.trailerUrl && !trailerYoutubeId)
    throw new DomainError(
      "O link do trailer não é um vídeo YouTube válido.",
      "invalid_video",
    );
  if (input.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId));
    if (!cat) throw new DomainError("Categoria desconhecida.", "invalid");
  }
  const slug =
    course.status === "draft" && input.title !== course.title
      ? await uniqueSlug(db, input.title, course.id)
      : course.slug;
  const { trailerUrl: _t, ...fields } = input;
  await db
    .update(courses)
    .set({ ...fields, slug, trailerYoutubeId, updatedAt: new Date() })
    .where(eq(courses.id, course.id));
  await audit(db, {
    actorId: actor.id,
    action: "course.updated",
    entityType: "course",
    entityId: course.id,
  });
}

// ─── Modules & lessons ───────────────────────────────────────────────────────

async function nextPosition(
  db: Executor,
  table: typeof modules | typeof lessons,
  column: "courseId" | "moduleId",
  id: string,
) {
  const col =
    column === "courseId"
      ? (table as typeof modules).courseId
      : (table as typeof lessons).moduleId;
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${table.position}), -1)::int` })
    .from(table)
    .where(eq(col, id));
  return (row?.max ?? -1) + 1;
}

export async function addModule(
  db: Db,
  actor: Actor,
  courseId: string,
  title: string,
) {
  await editableCourse(db, actor, courseId);
  const clean = title.trim().slice(0, 120);
  if (!clean) throw new DomainError("Dá um título ao módulo.", "invalid");
  const position = await nextPosition(db, modules, "courseId", courseId);
  const [row] = await db
    .insert(modules)
    .values({ courseId, title: clean, position })
    .returning();
  await touch(db, courseId);
  return row!;
}

async function moduleWithCourse(db: Executor, actor: Actor, moduleId: string) {
  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!mod) throw new NotFoundError("Módulo não encontrado.");
  const course = await editableCourse(db, actor, mod.courseId);
  return { mod, course };
}

export async function renameModule(
  db: Db,
  actor: Actor,
  moduleId: string,
  title: string,
) {
  const { mod } = await moduleWithCourse(db, actor, moduleId);
  const clean = title.trim().slice(0, 120);
  if (!clean) throw new DomainError("Dá um título ao módulo.", "invalid");
  await db.update(modules).set({ title: clean }).where(eq(modules.id, mod.id));
  await touch(db, mod.courseId);
}

async function hasStudentProgress(
  db: Executor,
  condition: ReturnType<typeof eq>,
) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(condition);
  return (row?.n ?? 0) > 0;
}

export async function deleteModule(db: Db, actor: Actor, moduleId: string) {
  const { mod } = await moduleWithCourse(db, actor, moduleId);
  if (await hasStudentProgress(db, eq(lessons.moduleId, mod.id))) {
    throw new DomainError(
      "Este módulo tem aulas com progresso de estudantes. Edita as aulas em vez de as apagar.",
      "has_progress",
    );
  }
  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(modules)
    .where(eq(modules.courseId, mod.courseId));
  if ((count?.n ?? 0) <= 1)
    throw new DomainError(
      "Um curso precisa de pelo menos um módulo.",
      "last_module",
    );
  await db.delete(modules).where(eq(modules.id, mod.id));
  await touch(db, mod.courseId);
  await audit(db, {
    actorId: actor.id,
    action: "module.deleted",
    entityType: "course",
    entityId: mod.courseId,
    data: { title: mod.title },
  });
}

/** Swaps position with the neighbour above/below. */
export async function moveModule(
  db: Db,
  actor: Actor,
  moduleId: string,
  direction: "up" | "down",
) {
  const { mod } = await moduleWithCourse(db, actor, moduleId);
  await normalizePositions(db, mod.courseId);
  const [fresh] = await db.select().from(modules).where(eq(modules.id, mod.id));
  const [neighbour] = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.courseId, mod.courseId),
        direction === "up"
          ? lt(modules.position, fresh!.position)
          : gt(modules.position, fresh!.position),
      ),
    )
    .orderBy(
      direction === "up" ? desc(modules.position) : asc(modules.position),
    )
    .limit(1);
  if (!neighbour) return;
  await db.transaction(async (tx) => {
    await tx
      .update(modules)
      .set({ position: neighbour.position })
      .where(eq(modules.id, fresh!.id));
    await tx
      .update(modules)
      .set({ position: fresh!.position })
      .where(eq(modules.id, neighbour.id));
  });
}

async function normalizePositions(db: Executor, courseId: string) {
  const outline = await getOutline(db, courseId);
  for (const [i, m] of outline.entries()) {
    if (m.position !== i)
      await db.update(modules).set({ position: i }).where(eq(modules.id, m.id));
    for (const [j, l] of m.lessons.entries()) {
      if (l.position !== j)
        await db
          .update(lessons)
          .set({ position: j })
          .where(eq(lessons.id, l.id));
    }
  }
}

export async function addLesson(
  db: Db,
  actor: Actor,
  moduleId: string,
  title: string,
) {
  const { mod } = await moduleWithCourse(db, actor, moduleId);
  const clean = title.trim().slice(0, 160);
  if (!clean) throw new DomainError("Dá um título à aula.", "invalid");
  const position = await nextPosition(db, lessons, "moduleId", moduleId);
  const [row] = await db
    .insert(lessons)
    .values({ courseId: mod.courseId, moduleId, title: clean, position })
    .returning();
  await touch(db, mod.courseId);
  return row!;
}

async function lessonWithCourse(db: Executor, actor: Actor, lessonId: string) {
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!lesson) throw new NotFoundError("Aula não encontrada.");
  const course = await editableCourse(db, actor, lesson.courseId);
  return { lesson, course };
}

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Os materiais têm de ser links https://");

export const lessonSchema = z.object({
  title: z.string().trim().min(1, { error: "Dá um título à aula." }).max(160),
  summary: z.string().trim().max(400).default(""),
  body: z.string().max(20_000).default(""),
  task: z.string().trim().max(2000).default(""),
  youtubeUrl: z.string().trim().max(300).default(""),
  videoSource: z.string().trim().max(120).default(""),
  durationMinutes: z.number().int().min(0).max(600),
  isPreview: z.boolean(),
  resources: z
    .array(
      z.object({ title: z.string().trim().min(1).max(120), url: httpsUrl }),
    )
    .max(12),
});

export async function updateLesson(
  db: Db,
  actor: Actor,
  lessonId: string,
  raw: z.input<typeof lessonSchema>,
) {
  const { lesson } = await lessonWithCourse(db, actor, lessonId);
  const input = lessonSchema.parse(raw);
  const youtubeVideoId = input.youtubeUrl
    ? parseYouTubeId(input.youtubeUrl)
    : null;
  if (input.youtubeUrl && !youtubeVideoId) {
    throw new DomainError(
      "Não reconheci esse link. Usa um link do YouTube (youtube.com/watch?v=… ou youtu.be/…).",
      "invalid_video",
    );
  }
  await db
    .update(lessons)
    .set({
      title: input.title,
      summary: input.summary,
      body: input.body,
      task: input.task,
      youtubeVideoId,
      videoSource: input.videoSource || null,
      durationSeconds: input.durationMinutes * 60,
      isPreview: input.isPreview,
      resources: input.resources,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lesson.id));
  await touch(db, lesson.courseId);
}

export async function deleteLesson(db: Db, actor: Actor, lessonId: string) {
  const { lesson } = await lessonWithCourse(db, actor, lessonId);
  if (await hasStudentProgress(db, eq(lessons.id, lesson.id))) {
    throw new DomainError(
      "Esta aula já tem progresso de estudantes. Edita o conteúdo em vez de a apagar.",
      "has_progress",
    );
  }
  await db.delete(lessons).where(eq(lessons.id, lesson.id));
  await touch(db, lesson.courseId);
  await audit(db, {
    actorId: actor.id,
    action: "lesson.deleted",
    entityType: "course",
    entityId: lesson.courseId,
    data: { title: lesson.title },
  });
}

export async function moveLesson(
  db: Db,
  actor: Actor,
  lessonId: string,
  direction: "up" | "down",
) {
  const { lesson } = await lessonWithCourse(db, actor, lessonId);
  await normalizePositions(db, lesson.courseId);
  const [fresh] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lesson.id));
  const [neighbour] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.moduleId, lesson.moduleId),
        direction === "up"
          ? lt(lessons.position, fresh!.position)
          : gt(lessons.position, fresh!.position),
      ),
    )
    .orderBy(
      direction === "up" ? desc(lessons.position) : asc(lessons.position),
    )
    .limit(1);
  if (!neighbour) return;
  await db.transaction(async (tx) => {
    await tx
      .update(lessons)
      .set({ position: neighbour.position })
      .where(eq(lessons.id, fresh!.id));
    await tx
      .update(lessons)
      .set({ position: fresh!.position })
      .where(eq(lessons.id, neighbour.id));
  });
}

// ─── Assessment ──────────────────────────────────────────────────────────────

export const questionSchema = z
  .object({
    prompt: z.string().trim().min(5, { error: "Escreve a pergunta." }).max(500),
    options: z
      .array(z.string().trim().min(1).max(200))
      .min(2, { error: "Pelo menos duas opções." })
      .max(6),
    correctIndex: z.number().int().min(0),
    explanation: z.string().trim().max(600).default(""),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    error: "Escolhe a resposta correta.",
    path: ["correctIndex"],
  });

export async function saveQuestion(
  db: Db,
  actor: Actor,
  courseId: string,
  questionId: string | null,
  raw: z.input<typeof questionSchema>,
) {
  await editableCourse(db, actor, courseId);
  const input = questionSchema.parse(raw);
  if (questionId) {
    const updated = await db
      .update(quizQuestions)
      .set(input)
      .where(
        and(
          eq(quizQuestions.id, questionId),
          eq(quizQuestions.courseId, courseId),
        ),
      )
      .returning({ id: quizQuestions.id });
    if (!updated.length) throw new NotFoundError("Pergunta não encontrada.");
  } else {
    const [row] = await db
      .select({
        max: sql<number>`coalesce(max(${quizQuestions.position}), -1)::int`,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.courseId, courseId));
    await db
      .insert(quizQuestions)
      .values({ ...input, courseId, position: (row?.max ?? -1) + 1 });
  }
  await touch(db, courseId);
}

export async function deleteQuestion(
  db: Db,
  actor: Actor,
  courseId: string,
  questionId: string,
) {
  await editableCourse(db, actor, courseId);
  await db
    .delete(quizQuestions)
    .where(
      and(
        eq(quizQuestions.id, questionId),
        eq(quizQuestions.courseId, courseId),
      ),
    );
  await touch(db, courseId);
}

// ─── Publication workflow ────────────────────────────────────────────────────

/** Problems that block submission/publication. Empty list = ready. */
export async function publicationChecklist(db: Executor, course: Course) {
  const outline = await getOutline(db, course.id);
  const flat = outline.flatMap((m) => m.lessons);
  const problems: string[] = [];
  if (course.title.trim().length < 4) problems.push("Título do curso.");
  if (course.subtitle.trim().length < 10)
    problems.push("Subtítulo com pelo menos 10 caracteres.");
  if (course.description.trim().length < 80)
    problems.push("Descrição com pelo menos 80 caracteres.");
  if (!course.categoryId) problems.push("Categoria.");
  if (course.outcomes.length < 2)
    problems.push("Pelo menos 2 objetivos de aprendizagem.");
  if (flat.length < 1) problems.push("Pelo menos 1 aula.");
  if (outline.some((m) => m.lessons.length === 0))
    problems.push("Módulos vazios (adiciona aulas ou apaga-os).");
  const empty = flat.filter(
    (l) => !l.youtubeVideoId && l.body.trim().length < 40,
  );
  if (empty.length)
    problems.push(
      `Aulas sem vídeo nem texto: ${empty.map((l) => `"${l.title}"`).join(", ")}.`,
    );
  if (!flat.some((l) => l.isPreview))
    problems.push("Marca pelo menos uma aula como pré-visualização gratuita.");
  return problems;
}

export async function submitForReview(db: Db, actor: Actor, courseId: string) {
  const course = await editableCourse(db, actor, courseId);
  if (course.status !== "draft")
    throw new DomainError(
      "Só cursos em rascunho podem ser enviados para revisão.",
      "invalid_status",
    );
  const problems = await publicationChecklist(db, course);
  if (problems.length)
    throw new DomainError(
      `Antes de enviar, completa: ${problems.join(" ")}`,
      "incomplete",
    );
  await db
    .update(courses)
    .set({
      status: "in_review",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));
  await audit(db, {
    actorId: actor.id,
    action: "course.submitted",
    entityType: "course",
    entityId: courseId,
  });
}

export async function withdrawFromReview(
  db: Db,
  actor: Actor,
  courseId: string,
) {
  const course = await editableCourse(db, actor, courseId);
  if (course.status !== "in_review") return;
  await db
    .update(courses)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(courses.id, courseId));
}

function requireStaff(actor: Actor) {
  if (!isStaff(actor))
    throw new ForbiddenError("Apenas a gestão pode publicar cursos.");
}

export async function publishCourse(db: Db, actor: Actor, courseId: string) {
  requireStaff(actor);
  const course = await editableCourse(db, actor, courseId);
  const problems = await publicationChecklist(db, course);
  if (problems.length)
    throw new DomainError(`Ainda falta: ${problems.join(" ")}`, "incomplete");
  await db
    .update(courses)
    .set({
      status: "published",
      reviewNote: null,
      publishedAt: course.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));
  await audit(db, {
    actorId: actor.id,
    action: "course.published",
    entityType: "course",
    entityId: courseId,
  });
}

export async function requestChanges(
  db: Db,
  actor: Actor,
  courseId: string,
  note: string,
) {
  requireStaff(actor);
  const clean = note.trim().slice(0, 1500);
  if (clean.length < 5)
    throw new DomainError(
      "Explica ao instrutor o que precisa de mudar.",
      "missing_note",
    );
  await db
    .update(courses)
    .set({ status: "draft", reviewNote: clean, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  await audit(db, {
    actorId: actor.id,
    action: "course.changes_requested",
    entityType: "course",
    entityId: courseId,
    data: { note: clean },
  });
}

/** Unpublishing hides the course from the store; enrolled students keep their access. */
export async function setCourseStatus(
  db: Db,
  actor: Actor,
  courseId: string,
  status: "draft" | "archived",
) {
  requireStaff(actor);
  await db
    .update(courses)
    .set({ status, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  await audit(db, {
    actorId: actor.id,
    action: `course.${status}`,
    entityType: "course",
    entityId: courseId,
  });
}

export async function setFeatured(
  db: Db,
  actor: Actor,
  courseId: string,
  featured: boolean,
) {
  requireStaff(actor);
  await db.update(courses).set({ featured }).where(eq(courses.id, courseId));
}

export async function reassignInstructor(
  db: Db,
  actor: Actor,
  courseId: string,
  instructorId: string,
) {
  requireStaff(actor);
  const [instructor] = await db
    .select()
    .from(users)
    .where(eq(users.id, instructorId));
  if (!instructor || instructor.role === "student")
    throw new DomainError("Escolhe uma conta de instrutor.", "invalid");
  await db
    .update(courses)
    .set({ instructorId, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  await audit(db, {
    actorId: actor.id,
    action: "course.reassigned",
    entityType: "course",
    entityId: courseId,
    data: { instructorId },
  });
}

// ─── Editor reads ────────────────────────────────────────────────────────────

export async function getEditorData(
  db: Executor,
  actor: Actor,
  courseId: string,
) {
  const course = await editableCourse(db, actor, courseId);
  const outline = await getOutline(db, course.id);
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.courseId, course.id))
    .orderBy(quizQuestions.position);
  const cats = await db.select().from(categories).orderBy(categories.position);
  const problems = await publicationChecklist(db, course);
  return { course, outline, questions, categories: cats, problems };
}

export async function listEditableCourses(db: Executor, actor: Actor) {
  const result = await db.execute(
    sql`SELECT c.id, c.slug, c.title, c.status, c.price_cents AS "priceCents", c.currency, c.cover_seed AS "coverSeed",
          c.updated_at AS "updatedAt", c.review_note AS "reviewNote", u.name AS "instructorName",
          (SELECT count(*)::int FROM lessons l WHERE l.course_id = c.id) AS "lessonCount",
          (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS "studentCount"
        FROM courses c JOIN users u ON u.id = c.instructor_id
        WHERE ${isStaff(actor) ? sql`TRUE` : sql`c.instructor_id = ${actor.id}`}
        ORDER BY c.updated_at DESC`,
  );
  return rowsOf<{
    id: string;
    slug: string;
    title: string;
    status: Course["status"];
    priceCents: number;
    currency: string;
    coverSeed: number;
    updatedAt: Date;
    reviewNote: string | null;
    instructorName: string;
    lessonCount: number;
    studentCount: number;
  }>(result);
}
