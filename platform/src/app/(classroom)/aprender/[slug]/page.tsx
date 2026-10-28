import { notFound, redirect } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { getClassroom } from "@/server/learning/progress";

/** Entering a course resumes at the first unfinished lesson. */
export default async function CourseEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage(`/aprender/${slug}`);
  let target: string;
  try {
    const classroom = await getClassroom(await getDb(), user, slug);
    target = classroom.nextLessonId ? `/aprender/${slug}/${classroom.nextLessonId}` : `/cursos/${slug}`;
  } catch (error) {
    if (error instanceof DomainError && error.code === "forbidden") redirect(`/cursos/${slug}`);
    notFound();
  }
  redirect(target);
}
