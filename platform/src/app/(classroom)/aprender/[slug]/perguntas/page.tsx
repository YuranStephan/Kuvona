import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuestionBoard } from "@/components/classroom/qa";
import { ClassroomShell } from "@/components/classroom/shell";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { listQuestions } from "@/server/learning/community";
import { getClassroom } from "@/server/learning/progress";

export const metadata: Metadata = { title: "Perguntas e respostas" };

export default async function CourseQuestionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage(`/aprender/${slug}/perguntas`);
  const db = await getDb();
  let classroom;
  try {
    classroom = await getClassroom(db, user, slug);
  } catch (error) {
    if (error instanceof DomainError && error.code === "forbidden") redirect(`/cursos/${slug}`);
    notFound();
  }
  const questions = await listQuestions(db, user, classroom.course.id);
  return (
    <ClassroomShell data={classroom}>
      <div className="quiz" style={{ gap: 18 }}>
        <div className="stack" style={{ ["--gap" as string]: "8px" }}>
          <span className="eyebrow" style={{ color: "var(--saffron)" }}>
            Comunidade do curso
          </span>
          <h1 className="h1" style={{ color: "#fffdf8" }}>
            Perguntas e respostas
          </h1>
          <p className="muted">Pergunta ao instrutor e aos colegas. Respostas do instrutor aparecem destacadas.</p>
        </div>
        <QuestionBoard courseId={classroom.course.id} lessonId={null} questions={questions} showLesson />
      </div>
    </ClassroomShell>
  );
}
