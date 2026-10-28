import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { completeLessonAction } from "@/actions/learning";
import { LessonTabs, NoteEditor } from "@/components/classroom/lesson-tabs";
import { LessonPlayer } from "@/components/classroom/player";
import { QuestionBoard } from "@/components/classroom/qa";
import { ClassroomShell } from "@/components/classroom/shell";
import { CourseCover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { youTubeWatchUrl } from "@/lib/youtube";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { listQuestions } from "@/server/learning/community";
import { getLessonView } from "@/server/learning/progress";

export const metadata: Metadata = { title: "Aula" };

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const user = await requireUserPage(`/aprender/${slug}/${lessonId}`);
  const db = await getDb();
  let view;
  try {
    view = await getLessonView(db, user, slug, lessonId);
  } catch (error) {
    if (error instanceof DomainError && error.code === "forbidden") redirect(`/cursos/${slug}`);
    notFound();
  }
  const { lesson, course, prev, next, lessonProgress, note } = view;
  const questions = await listQuestions(db, user, course.id, { lessonId: lesson.id });
  const isDone = Boolean(lessonProgress?.completedAt);
  const nextHref = next ? `/aprender/${course.slug}/${next.id}` : `/aprender/${course.slug}/avaliacao`;

  return (
    <ClassroomShell data={view} currentLessonId={lesson.id}>
      {lesson.youtubeVideoId ? (
        <div className="stack" style={{ ["--gap" as string]: "10px" }}>
          <LessonPlayer lessonId={lesson.id} videoId={lesson.youtubeVideoId} startAt={lessonProgress?.positionSeconds ?? 0} track={view.access === "enrolled"} />
          <div className="player-meta">
            <span>
              Vídeo{lesson.videoSource ? `: ${lesson.videoSource}` : ""} · alojado no YouTube
            </span>
            <a href={youTubeWatchUrl(lesson.youtubeVideoId)} target="_blank" rel="noopener noreferrer">
              Abrir no YouTube <Icon name="external" size={13} style={{ display: "inline", verticalAlign: -2 }} />
            </a>
          </div>
        </div>
      ) : (
        <div className="player player-text-hero">
          <CourseCover seed={course.coverSeed} title={course.title} rounded={false} />
          <span className="badge" style={{ position: "relative", justifySelf: "start" }}>
            <Icon name="text" size={14} /> Aula de leitura
          </span>
        </div>
      )}

      <div className="cl-lesson-head">
        <span className="small" style={{ color: "var(--saffron)", fontWeight: 650 }}>
          Aula {view.index + 1} de {view.total}
          {lesson.durationSeconds > 0 && ` · ${formatDuration(lesson.durationSeconds)}`}
          {isDone && " · Concluída ✓"}
        </span>
        <h1>{lesson.title}</h1>
      </div>

      <LessonTabs
        tabs={[
          {
            id: "aula",
            label: "Aula",
            icon: "book",
            content: (
              <div className="stack" style={{ ["--gap" as string]: "24px" }}>
                {lesson.body ? <Markdown text={lesson.body} /> : <p className="muted">Esta aula não tem texto de apoio.</p>}
                {lesson.task && (
                  <div className="cl-task">
                    <strong className="row" style={{ ["--gap" as string]: "8px", color: "var(--saffron)" }}>
                      <Icon name="edit" size={18} /> Exercício prático
                    </strong>
                    <p>{lesson.task}</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "notas",
            label: "Notas",
            icon: "edit",
            content: <NoteEditor lessonId={lesson.id} initial={note?.body ?? ""} updatedAt={note?.updatedAt ? new Date(note.updatedAt).toISOString() : null} />,
          },
          {
            id: "perguntas",
            label: "Perguntas",
            icon: "message",
            count: questions.length,
            content: <QuestionBoard courseId={course.id} lessonId={lesson.id} questions={questions} />,
          },
          {
            id: "materiais",
            label: "Materiais",
            icon: "file",
            count: lesson.resources.length,
            content: lesson.resources.length ? (
              <div className="stack" style={{ ["--gap" as string]: "10px" }}>
                {lesson.resources.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="resource-link">
                    <Icon name="link" size={18} />
                    <span style={{ flex: 1 }}>{r.title}</span>
                    <Icon name="external" size={16} />
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState icon="file" title="Sem materiais nesta aula" />
            ),
          },
        ]}
      />

      <nav className="cl-nav" aria-label="Navegação entre aulas">
        {prev ? (
          <Link href={`/aprender/${course.slug}/${prev.id}`} className="btn btn-ghost">
            <Icon name="arrowLeft" size={18} /> Anterior
          </Link>
        ) : (
          <span />
        )}
        <div className="row">
          {isDone ? (
            <>
              <ActionForm action={completeLessonAction.bind(null, lesson.id, false, null)} showSuccess={false}>
                <SubmitButton className="btn btn-soft" pendingLabel="…">
                  <Icon name="undo" size={17} /> Marcar por concluir
                </SubmitButton>
              </ActionForm>
              <Link href={nextHref} className="btn btn-accent">
                {next ? "Próxima aula" : "Avaliação final"} <Icon name="arrowRight" size={18} />
              </Link>
            </>
          ) : (
            <ActionForm action={completeLessonAction.bind(null, lesson.id, true, nextHref)} showSuccess={false}>
              <SubmitButton className="btn btn-accent" pendingLabel="A guardar…">
                <Icon name="check" size={18} /> Concluir {next ? "e continuar" : "e ir para a avaliação"}
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </nav>
    </ClassroomShell>
  );
}
