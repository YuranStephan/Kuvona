import { and, desc, eq } from "drizzle-orm";
import type { Db, Executor } from "../db/client";
import { courses, quizAttempts, quizQuestions, type Role } from "../db/schema";
import { courseAccess } from "../enrollment/service";
import { DomainError, ForbiddenError, NotFoundError } from "../errors";
import { flattenOutline, getOutline } from "../catalog/queries";
import { progressMap } from "./progress";
import { issueCertificateIfEligible } from "../certificates/service";

type Viewer = { id: string; role: Role };
export const PASS_PERCENT = 70;

async function loadCourse(db: Executor, viewer: Viewer, courseId: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new NotFoundError("Curso não encontrado.");
  const access = await courseAccess(db, viewer, course);
  if (!access) throw new ForbiddenError("Ainda não tens acesso a este curso.");
  return course;
}

async function allLessonsDone(db: Executor, userId: string, courseId: string) {
  const flat = flattenOutline(await getOutline(db, courseId));
  const progress = await progressMap(db, userId, courseId);
  const remaining = flat.filter((l) => !progress.get(l.id)?.completedAt).length;
  return { done: flat.length > 0 && remaining === 0, remaining };
}

/** Questions without answers: the key never leaves the server before an attempt. */
export async function getQuizForStudent(db: Executor, viewer: Viewer, courseId: string) {
  const course = await loadCourse(db, viewer, courseId);
  const questions = await db
    .select({ id: quizQuestions.id, prompt: quizQuestions.prompt, options: quizQuestions.options })
    .from(quizQuestions)
    .where(eq(quizQuestions.courseId, course.id))
    .orderBy(quizQuestions.position);
  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, viewer.id), eq(quizAttempts.courseId, course.id)))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(20);
  const lessonsState = await allLessonsDone(db, viewer.id, course.id);
  return {
    course,
    questions,
    attempts,
    bestScore: attempts.reduce((best, a) => Math.max(best, a.scorePercent), 0),
    passed: attempts.some((a) => a.passed),
    unlocked: lessonsState.done,
    remainingLessons: lessonsState.remaining,
  };
}

export async function submitQuiz(db: Db, viewer: Viewer, courseId: string, answers: number[]) {
  const course = await loadCourse(db, viewer, courseId);
  const lessonsState = await allLessonsDone(db, viewer.id, course.id);
  if (!lessonsState.done) throw new DomainError("Conclui todas as aulas antes da avaliação final.", "locked");
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.courseId, course.id)).orderBy(quizQuestions.position);
  if (!questions.length) throw new DomainError("Este curso não tem avaliação.", "no_quiz");
  if (answers.length !== questions.length || answers.some((a) => !Number.isInteger(a) || a < 0)) {
    throw new DomainError("Responde a todas as perguntas.", "incomplete");
  }
  const correctCount = questions.filter((q, i) => q.correctIndex === answers[i]).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= PASS_PERCENT;
  const [attempt] = await db
    .insert(quizAttempts)
    .values({ userId: viewer.id, courseId: course.id, answers, correctCount, totalCount: questions.length, scorePercent, passed })
    .returning();
  const certificate = passed ? await issueCertificateIfEligible(db, viewer.id, course.id) : null;
  return {
    attempt: attempt!,
    review: questions.map((q, i) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      chosen: answers[i]!,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    certificateCode: certificate?.code ?? null,
  };
}
