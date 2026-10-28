import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db, Executor } from "../db/client";
import {
  answers,
  courses,
  instructorApplications,
  lessonProgress,
  lessons,
  questions,
  reviews,
  users,
  type Role,
} from "../db/schema";
import { audit } from "../audit";
import { courseAccess, getActiveEnrollment } from "../enrollment/service";
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  isUniqueViolation,
} from "../errors";
import { appUrl, composeEmail, sendEmail } from "../email";
import { rowsOf } from "../catalog/queries";

type Viewer = { id: string; role: Role };

async function courseFor(db: Executor, viewer: Viewer, courseId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) throw new NotFoundError("Curso não encontrado.");
  const access = await courseAccess(db, viewer, course);
  if (!access)
    throw new ForbiddenError(
      "Só estudantes inscritos podem participar nesta discussão.",
    );
  return course;
}

// ─── Q&A ─────────────────────────────────────────────────────────────────────

export const questionInput = z.object({
  title: z
    .string()
    .trim()
    .min(5, { error: "Dá um título à tua pergunta." })
    .max(160),
  body: z.string().trim().min(5, { error: "Descreve a tua dúvida." }).max(4000),
});

export async function askQuestion(
  db: Db,
  viewer: Viewer,
  courseId: string,
  lessonId: string | null,
  raw: z.input<typeof questionInput>,
) {
  const course = await courseFor(db, viewer, courseId);
  const input = questionInput.parse(raw);
  if (lessonId) {
    const [lesson] = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, course.id)));
    if (!lesson) throw new NotFoundError("Aula não encontrada.");
  }
  const [row] = await db
    .insert(questions)
    .values({ courseId: course.id, lessonId, userId: viewer.id, ...input })
    .returning();
  if (course.instructorId !== viewer.id) {
    const [instructor] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, course.instructorId));
    if (instructor) {
      await sendEmail(
        db,
        composeEmail(instructor.email, `Nova pergunta em ${course.title}`, {
          title: "Tens uma nova pergunta",
          paragraphs: [`"${input.title}"`, input.body.slice(0, 400)],
          action: {
            label: "Responder",
            url: `${appUrl()}/instrutor/perguntas`,
          },
        }),
      );
    }
  }
  return row!;
}

export async function answerQuestion(
  db: Db,
  viewer: Viewer,
  questionId: string,
  body: string,
) {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);
  if (!question) throw new NotFoundError("Pergunta não encontrada.");
  const course = await courseFor(db, viewer, question.courseId);
  const text = body.trim().slice(0, 4000);
  if (text.length < 2)
    throw new DomainError("Escreve uma resposta.", "invalid");
  const [row] = await db
    .insert(answers)
    .values({ questionId, userId: viewer.id, body: text })
    .returning();
  if (question.userId !== viewer.id) {
    const [asker] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, question.userId));
    if (asker) {
      await sendEmail(
        db,
        composeEmail(
          asker.email,
          `Resposta à tua pergunta em ${course.title}`,
          {
            title: "A tua pergunta tem uma resposta",
            paragraphs: [`"${question.title}"`, text.slice(0, 400)],
            action: {
              label: "Ver a discussão",
              url: `${appUrl()}/aprender/${course.slug}/perguntas`,
            },
          },
        ),
      );
    }
  }
  return row!;
}

export async function listQuestions(
  db: Executor,
  viewer: Viewer,
  courseId: string,
  opts: { lessonId?: string } = {},
) {
  const course = await courseFor(db, viewer, courseId);
  const qs = await db
    .select({
      id: questions.id,
      title: questions.title,
      body: questions.body,
      createdAt: questions.createdAt,
      lessonId: questions.lessonId,
      lessonTitle: lessons.title,
      userId: users.id,
      userName: users.name,
    })
    .from(questions)
    .innerJoin(users, eq(users.id, questions.userId))
    .leftJoin(lessons, eq(lessons.id, questions.lessonId))
    .where(
      and(
        eq(questions.courseId, course.id),
        opts.lessonId ? eq(questions.lessonId, opts.lessonId) : undefined,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(100);
  const ans = qs.length
    ? await db
        .select({
          id: answers.id,
          questionId: answers.questionId,
          body: answers.body,
          createdAt: answers.createdAt,
          userId: users.id,
          userName: users.name,
          role: users.role,
        })
        .from(answers)
        .innerJoin(users, eq(users.id, answers.userId))
        .where(
          inArray(
            answers.questionId,
            qs.map((q) => q.id),
          ),
        )
        .orderBy(answers.createdAt)
    : [];
  return qs.map((q) => ({
    ...q,
    answers: ans
      .filter((a) => a.questionId === q.id)
      .map((a) => ({
        ...a,
        isInstructor: a.userId === course.instructorId,
        isStaff: a.role === "admin",
      })),
  }));
}

/** Questions in the instructor's courses that the instructor hasn't answered yet. */
export async function instructorInbox(
  db: Executor,
  instructorId: string,
  isAdmin: boolean,
) {
  const result = await db.execute(
    sql`SELECT q.id, q.title, q.body, q.created_at AS "createdAt", c.id AS "courseId", c.title AS "courseTitle", c.slug AS "courseSlug",
          u.name AS "userName", l.title AS "lessonTitle",
          EXISTS (SELECT 1 FROM answers a JOIN users responder ON responder.id = a.user_id WHERE a.question_id = q.id AND (a.user_id = c.instructor_id OR responder.role = 'admin')) AS "answered",
          (SELECT count(*)::int FROM answers a WHERE a.question_id = q.id) AS "answerCount"
        FROM questions q
        JOIN courses c ON c.id = q.course_id
        JOIN users u ON u.id = q.user_id
        LEFT JOIN lessons l ON l.id = q.lesson_id
        WHERE ${isAdmin ? sql`TRUE` : sql`c.instructor_id = ${instructorId}`}
        ORDER BY "answered" ASC, q.created_at DESC
        LIMIT 200`,
  );
  return rowsOf<{
    id: string;
    title: string;
    body: string;
    createdAt: Date;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    userName: string;
    lessonTitle: string | null;
    answered: boolean;
    answerCount: number;
  }>(result);
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviewInput = z.object({
  rating: z
    .number()
    .int()
    .min(1, { error: "Escolhe de 1 a 5 estrelas." })
    .max(5),
  body: z.string().trim().max(2000).default(""),
});

/** Only enrolled students who completed at least one lesson can review: no invented ratings. */
export async function upsertReview(
  db: Db,
  viewer: Viewer,
  courseId: string,
  raw: z.input<typeof reviewInput>,
) {
  const input = reviewInput.parse(raw);
  if (!(await getActiveEnrollment(db, viewer.id, courseId)))
    throw new ForbiddenError("Só estudantes inscritos podem avaliar o curso.");
  const [done] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, viewer.id),
        eq(lessonProgress.courseId, courseId),
        isNotNull(lessonProgress.completedAt),
      ),
    );
  if ((done?.n ?? 0) < 1)
    throw new DomainError(
      "Conclui pelo menos uma aula antes de avaliar.",
      "too_early",
    );
  await db
    .insert(reviews)
    .values({
      userId: viewer.id,
      courseId,
      rating: input.rating,
      body: input.body,
    })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.courseId],
      set: { rating: input.rating, body: input.body, updatedAt: new Date() },
    });
}

export async function setReviewHidden(
  db: Db,
  actor: Viewer,
  reviewId: string,
  hidden: boolean,
) {
  if (actor.role !== "admin") throw new ForbiddenError();
  await db
    .update(reviews)
    .set({ hiddenAt: hidden ? new Date() : null })
    .where(eq(reviews.id, reviewId));
  await audit(db, {
    actorId: actor.id,
    action: hidden ? "review.hidden" : "review.shown",
    entityType: "review",
    entityId: reviewId,
  });
}

// ─── Instructor applications ─────────────────────────────────────────────────

export const applicationInput = z.object({
  expertise: z.string().trim().min(3, { error: "Indica a tua área." }).max(200),
  motivation: z
    .string()
    .trim()
    .min(40, { error: "Conta-nos um pouco mais (pelo menos 40 caracteres)." })
    .max(3000),
  links: z.string().trim().max(500).default(""),
});

export async function applyAsInstructor(
  db: Db,
  viewer: Viewer,
  raw: z.input<typeof applicationInput>,
) {
  if (viewer.role !== "student")
    throw new DomainError(
      "A tua conta já pode criar cursos.",
      "already_instructor",
    );
  const input = applicationInput.parse(raw);
  try {
    await db
      .insert(instructorApplications)
      .values({ userId: viewer.id, ...input });
  } catch (error) {
    if (isUniqueViolation(error, "instructor_applications_one_pending")) {
      throw new DomainError("Já tens uma candidatura em análise.", "pending");
    }
    throw error;
  }
}

export async function decideApplication(
  db: Db,
  actor: Viewer,
  applicationId: string,
  approve: boolean,
  note: string,
) {
  if (actor.role !== "admin") throw new ForbiddenError();
  const app = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(instructorApplications)
      .set({
        status: approve ? "approved" : "rejected",
        decisionNote: note.trim().slice(0, 1000) || null,
        decidedBy: actor.id,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(instructorApplications.id, applicationId),
          eq(instructorApplications.status, "pending"),
        ),
      )
      .returning();
    if (!row)
      throw new DomainError("Esta candidatura já foi decidida.", "decided");
    if (approve) {
      await tx
        .update(users)
        .set({ role: "instructor", updatedAt: new Date() })
        .where(and(eq(users.id, row.userId), eq(users.role, "student")));
    }
    await audit(tx, {
      actorId: actor.id,
      action: approve ? "application.approved" : "application.rejected",
      entityType: "user",
      entityId: row.userId,
    });
    return row;
  });
  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, app.userId));
  if (user) {
    await sendEmail(
      db,
      composeEmail(
        user.email,
        approve
          ? "Bem-vindo(a) à equipa de instrutores"
          : "A tua candidatura a instrutor",
        {
          title: approve ? "Candidatura aprovada" : "Candidatura não aprovada",
          paragraphs: approve
            ? [
                `Olá ${user.name}, já podes criar o teu primeiro curso na área do instrutor.`,
                ...(note ? [note] : []),
              ]
            : [
                `Olá ${user.name}, desta vez não avançámos com a tua candidatura.`,
                ...(note ? [`Nota da equipa: ${note}`] : []),
              ],
          action: approve
            ? {
                label: "Abrir a área do instrutor",
                url: `${appUrl()}/instrutor`,
              }
            : undefined,
        },
      ),
    );
  }
  return app;
}

export async function myApplication(db: Executor, userId: string) {
  const [row] = await db
    .select()
    .from(instructorApplications)
    .where(eq(instructorApplications.userId, userId))
    .orderBy(desc(instructorApplications.createdAt))
    .limit(1);
  return row ?? null;
}
