import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/cover";
import { Icon } from "@/components/icon";
import { Avatar, Progress, ProgressRing } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import type { getClassroom } from "@/server/learning/progress";

type Classroom = Awaited<ReturnType<typeof getClassroom>>;

export function ClassroomShell({ data, currentLessonId, children }: { data: Classroom; currentLessonId?: string; children: ReactNode }) {
  const { course, outline, progress, completed, total, percent } = data;
  return (
    <div className="classroom">
      <header className="cl-top">
        <Link href="/aprender" aria-label="Voltar à minha aprendizagem" className="btn btn-ghost btn-icon">
          <Icon name="arrowLeft" />
        </Link>
        <Link href="/" className="desktop-only" aria-label="Kuvona">
          <Logo size={24} withWord={false} tone="paper" />
        </Link>
        <span className="cl-title">{course.title}</span>
        <Link href={`/aprender/${course.slug}/perguntas`} className="btn btn-ghost btn-sm desktop-only">
          <Icon name="message" size={17} /> Perguntas
        </Link>
        <Link href={`/aprender/${course.slug}/avaliacao`} className="btn btn-ghost btn-sm desktop-only">
          <Icon name="award" size={17} /> Avaliação
        </Link>
        <ProgressRing value={percent} size={40} tone="paper" />
      </header>
      <div className="cl-grid">
        <main id="conteudo" className="cl-main">
          {data.access !== "enrolled" && (
            <div className="alert alert-info">
              <Icon name="eye" size={18} />
              <div>
                Estás a ver como {data.access === "owner" ? "instrutor" : "gestão"}. O teu progresso não conta para estatísticas nem certificados.
              </div>
            </div>
          )}
          {children}
        </main>
        <aside className="cl-side" aria-label="Conteúdo do curso">
          <div className="cl-side-head">
            <div className="spread">
              <strong>Conteúdo do curso</strong>
              <span className="small" style={{ color: "var(--cl-muted)" }}>
                {completed}/{total}
              </span>
            </div>
            <Progress value={percent} thin label="Progresso do curso" />
            <div className="row small" style={{ ["--gap" as string]: "10px", color: "var(--cl-muted)" }}>
              <Avatar name={data.instructor.name} size={24} /> {data.instructor.name}
            </div>
          </div>
          {outline.map((m, mi) => {
            const done = m.lessons.filter((l) => progress.get(l.id)?.completedAt).length;
            const hasCurrent = m.lessons.some((l) => l.id === currentLessonId);
            return (
              <details key={m.id} className="cl-module" open={hasCurrent || mi === 0 || !currentLessonId}>
                <summary>
                  <span>
                    {mi + 1}. {m.title}
                  </span>
                  <span className="small" style={{ color: "var(--cl-muted)", fontWeight: 500 }}>
                    {done}/{m.lessons.length}
                  </span>
                </summary>
                <ol>
                  {m.lessons.map((l) => {
                    const isDone = Boolean(progress.get(l.id)?.completedAt);
                    return (
                      <li key={l.id}>
                        <Link href={`/aprender/${course.slug}/${l.id}`} className="cl-lesson" aria-current={l.id === currentLessonId ? "page" : undefined}>
                          {isDone ? <Icon name="checkCircle" size={20} className="done" /> : <span className="dot" aria-hidden="true" />}
                          <span>
                            {l.title}
                            <span className="sr-only">{isDone ? " (concluída)" : ""}</span>
                          </span>
                          <span className="xsmall" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                            <Icon name={l.youtubeVideoId ? "video" : "text"} size={13} />
                            {l.durationSeconds > 0 ? formatDuration(l.durationSeconds) : ""}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </details>
            );
          })}
          <div style={{ padding: 20, display: "grid", gap: 10 }}>
            <Link href={`/aprender/${course.slug}/avaliacao`} className="btn btn-outline btn-sm btn-block">
              <Icon name="award" size={16} /> Avaliação final e certificado
            </Link>
            <Link href={`/aprender/${course.slug}/perguntas`} className="btn btn-ghost btn-sm btn-block">
              <Icon name="message" size={16} /> Perguntas e respostas
            </Link>
            <Link href={`/cursos/${course.slug}`} className="btn btn-ghost btn-sm btn-block">
              <Icon name="info" size={16} /> Página do curso
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
