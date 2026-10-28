"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
import { recordProgress, saveNote, setLessonCompleted } from "@/server/learning/progress";
import { submitQuiz } from "@/server/learning/quiz";
import { answerQuestion, applyAsInstructor, askQuestion } from "@/server/learning/community";
import { issueCertificateIfEligible } from "@/server/certificates/service";
import { failure, str, success, type ActionState } from "./result";

/** Player heartbeat. Silent on failure: a missed beat must never interrupt the video. */
export async function progressAction(input: { lessonId: string; position: number; duration: number; ended: boolean }) {
  try {
    const user = await requireUser();
    const db = await getDb();
    const result = await recordProgress(db, user, {
      lessonId: input.lessonId,
      positionSeconds: Number(input.position) || 0,
      durationSeconds: Number(input.duration) || 0,
      ended: Boolean(input.ended),
    });
    return { ok: true, completed: result.completed };
  } catch {
    return { ok: false, completed: false };
  }
}

export async function completeLessonAction(lessonId: string, completed: boolean, nextHref: string | null, _: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    const db = await getDb();
    const lesson = await setLessonCompleted(db, user, lessonId, completed);
    if (completed) await issueCertificateIfEligible(db, user.id, lesson.courseId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  if (completed && nextHref) redirect(nextHref);
  return success(completed ? "Aula concluída." : "Aula marcada como por concluir.");
}

export async function saveNoteAction(lessonId: string, body: string) {
  try {
    const user = await requireUser();
    await saveNote(await getDb(), user, lessonId, body);
    return { ok: true, savedAt: new Date().toISOString() };
  } catch {
    return { ok: false, savedAt: null };
  }
}

export async function askQuestionAction(courseId: string, lessonId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    await askQuestion(await getDb(), user, courseId, lessonId, { title: str(form, "title"), body: str(form, "body") });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Pergunta publicada. O instrutor recebe uma notificação.");
}

export async function answerQuestionAction(questionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    await answerQuestion(await getDb(), user, questionId, str(form, "body"));
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Resposta publicada.");
}

export type QuizResult = Awaited<ReturnType<typeof submitQuiz>> | { error: string };

export async function submitQuizAction(courseId: string, answers: number[]): Promise<QuizResult> {
  try {
    const user = await requireUser();
    const result = await submitQuiz(await getDb(), user, courseId, answers);
    revalidatePath("/", "layout");
    return result;
  } catch (error) {
    return { error: failure(error).error ?? "Erro inesperado." };
  }
}

export async function applyInstructorAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    await applyAsInstructor(await getDb(), user, {
      expertise: str(form, "expertise"),
      motivation: str(form, "motivation"),
      links: str(form, "links"),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Candidatura enviada! A equipa responde por email.");
}
