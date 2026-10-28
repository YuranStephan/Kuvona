import Link from "next/link";
import { answerQuestionAction } from "@/actions/learning";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/workspace";
import { Markdown } from "@/components/markdown";
import { formatDateTime } from "@/lib/format";
import { requireRolePage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { instructorInbox } from "@/server/learning/community";

export default async function InstructorQuestions() {
  const user = await requireRolePage(
    ["instructor", "admin"],
    "/instrutor/perguntas",
  );
  const questions = await instructorInbox(
    await getDb(),
    user.id,
    user.role === "admin",
  );
  return (
    <>
      <PageHeader eyebrow="Instrutor" title="Perguntas dos estudantes" />
      {!questions.length ? (
        <EmptyState icon="message" title="Ainda não há perguntas">
          As perguntas colocadas nas tuas aulas aparecem aqui.
        </EmptyState>
      ) : (
        <div className="stack" style={{ ["--gap" as string]: "24px" }}>
          {questions.map((q) => (
            <article
              className="form-section"
              key={q.id}
              id={q.id}
              style={{
                borderLeft: q.answered ? undefined : "3px solid var(--teal)",
              }}
            >
              <div className="spread">
                <Link
                  className="link small"
                  href={`/instrutor/cursos/${q.courseId}`}
                >
                  {q.courseTitle}
                </Link>
                <span
                  className={`badge ${q.answered ? "badge-gray" : "badge-teal"}`}
                >
                  {q.answered ? "Respondida" : "Por responder"}
                </span>
              </div>
              <div>
                <h2>{q.title}</h2>
                <p className="hint">
                  {q.userName} · {formatDateTime(q.createdAt)}
                  {q.lessonTitle ? ` · ${q.lessonTitle}` : ""}
                </p>
              </div>
              <Markdown text={q.body} />
              <ActionForm
                action={answerQuestionAction.bind(null, q.id)}
                resetOnSuccess
                className="stack"
              >
                <div className="field">
                  <label className="label" htmlFor={`answer-${q.id}`}>
                    {q.answered ? "Adicionar uma resposta" : "A tua resposta"}
                  </label>
                  <textarea
                    className="textarea"
                    name="body"
                    id={`answer-${q.id}`}
                    required
                    minLength={2}
                    maxLength={4000}
                  />
                </div>
                <div className="row">
                  <SubmitButton>Publicar resposta</SubmitButton>
                  <Link
                    className="link small"
                    href={`/aprender/${q.courseSlug}/perguntas`}
                  >
                    Ver conversa · {q.answerCount} respostas
                  </Link>
                </div>
              </ActionForm>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
