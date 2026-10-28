"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMoneyToCents } from "@/lib/money";
import { getDb } from "@/server/db/client";
import { requireRole } from "@/server/auth/session";
import {
  addLesson,
  addModule,
  createCourse,
  deleteLesson,
  deleteModule,
  deleteQuestion,
  moveLesson,
  moveModule,
  renameModule,
  saveQuestion,
  submitForReview,
  updateCourseDetails,
  updateLesson,
  withdrawFromReview,
} from "@/server/catalog/editor";
import { DomainError } from "@/server/errors";
import { bool, failure, str, success, type ActionState } from "./result";

const staff = () => requireRole("instructor", "admin");
const done = () => revalidatePath("/", "layout");

const all = (form: FormData, key: string) =>
  form
    .getAll(key)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

function pairs(form: FormData, key: string): [string, string][] {
  const a = all(form, `${key}.a`);
  const b = all(form, `${key}.b`);
  return a
    .map((v, i) => [v, b[i] ?? ""] as [string, string])
    .filter(([x, y]) => x && y);
}

export async function createCourseAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    const actor = await staff();
    const course = await createCourse(await getDb(), actor, {
      title: str(form, "title"),
      instructorId: str(form, "instructorId") || undefined,
    });
    id = course.id;
  } catch (error) {
    return failure(error);
  }
  done();
  redirect(`/instrutor/cursos/${id}`);
}

export async function updateCourseAction(
  courseId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await staff();
    const priceText = str(form, "price").trim();
    const priceCents = priceText === "" ? 0 : parseMoneyToCents(priceText);
    if (priceCents === null)
      throw new DomainError(
        "Indica o preço em meticais, por exemplo 1500 ou 1 500,00.",
        "invalid_price",
      );
    await updateCourseDetails(await getDb(), actor, courseId, {
      title: str(form, "title"),
      subtitle: str(form, "subtitle"),
      description: str(form, "description"),
      categoryId: str(form, "categoryId") || null,
      level: str(form, "level") as "beginner",
      priceCents,
      coverSeed: form.has("coverSeed")
        ? Number(str(form, "coverSeed"))
        : undefined,
      trailerUrl: str(form, "trailerUrl"),
      outcomes: all(form, "outcomes"),
      requirements: all(form, "requirements"),
      audience: all(form, "audience"),
      skills: all(form, "skills"),
      project: str(form, "project"),
      faq: pairs(form, "faq").map(([q, a]) => ({ q, a })),
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Alterações guardadas.");
}

export async function addModuleAction(
  courseId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await addModule(await getDb(), await staff(), courseId, str(form, "title"));
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Módulo criado.");
}

export async function renameModuleAction(
  moduleId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await renameModule(
      await getDb(),
      await staff(),
      moduleId,
      str(form, "title"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Guardado.");
}

export async function deleteModuleAction(
  moduleId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await deleteModule(await getDb(), await staff(), moduleId);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Módulo apagado.");
}

export async function moveModuleAction(
  moduleId: string,
  direction: "up" | "down",
) {
  await moveModule(await getDb(), await staff(), moduleId, direction);
  done();
}

export async function addLessonAction(
  moduleId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await addLesson(await getDb(), await staff(), moduleId, str(form, "title"));
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Aula criada.");
}

export async function updateLessonAction(
  lessonId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const minutes = Number(str(form, "durationMinutes") || "0");
    if (!Number.isInteger(minutes) || minutes < 0)
      throw new DomainError(
        "A duração é um número inteiro de minutos.",
        "invalid",
      );
    await updateLesson(await getDb(), await staff(), lessonId, {
      title: str(form, "title"),
      summary: str(form, "summary"),
      body: str(form, "body"),
      task: str(form, "task"),
      youtubeUrl: str(form, "youtubeUrl"),
      videoSource: str(form, "videoSource"),
      durationMinutes: minutes,
      isPreview: bool(form, "isPreview"),
      resources: pairs(form, "resources").map(([title, url]) => ({
        title,
        url,
      })),
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Aula guardada.");
}

export async function deleteLessonAction(
  lessonId: string,
  courseId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await deleteLesson(await getDb(), await staff(), lessonId);
  } catch (error) {
    return failure(error);
  }
  done();
  redirect(`/instrutor/cursos/${courseId}/curriculo`);
}

export async function moveLessonAction(
  lessonId: string,
  direction: "up" | "down",
) {
  await moveLesson(await getDb(), await staff(), lessonId, direction);
  done();
}

export async function saveQuestionAction(
  courseId: string,
  questionId: string | null,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const options = all(form, "options");
    const correct = Number(str(form, "correctIndex"));
    await saveQuestion(await getDb(), await staff(), courseId, questionId, {
      prompt: str(form, "prompt"),
      options,
      correctIndex: Number.isInteger(correct) ? correct : -1,
      explanation: str(form, "explanation"),
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success(questionId ? "Pergunta atualizada." : "Pergunta adicionada.");
}

export async function deleteQuestionAction(
  courseId: string,
  questionId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await deleteQuestion(await getDb(), await staff(), courseId, questionId);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Pergunta apagada.");
}

export async function submitForReviewAction(
  courseId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await submitForReview(await getDb(), await staff(), courseId);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Curso enviado para revisão. A gestão vai analisá-lo.");
}

export async function withdrawFromReviewAction(
  courseId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await withdrawFromReview(await getDb(), await staff(), courseId);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("O curso voltou a rascunho.");
}
