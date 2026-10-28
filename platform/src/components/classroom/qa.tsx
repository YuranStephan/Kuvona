import { answerQuestionAction, askQuestionAction } from "@/actions/learning";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, EmptyState } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import type { listQuestions } from "@/server/learning/community";

type Question = Awaited<ReturnType<typeof listQuestions>>[number];

export function QuestionBoard({ courseId, lessonId, questions, showLesson }: { courseId: string; lessonId: string | null; questions: Question[]; showLesson?: boolean }) {
  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <details className="cl-card">
        <summary style={{ cursor: "pointer", fontWeight: 650 }}>Fazer uma pergunta {lessonId ? "sobre esta aula" : "ao instrutor"}</summary>
        <ActionForm action={askQuestionAction.bind(null, courseId, lessonId)} className="stack" resetOnSuccess>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label" htmlFor={`q-title-${lessonId ?? "c"}`}>
              Resumo da dúvida
            </label>
            <input className="input" id={`q-title-${lessonId ?? "c"}`} name="title" required minLength={5} maxLength={160} placeholder="ex.: Como otimizo uma imagem grande?" />
          </div>
          <div className="field">
            <label className="label" htmlFor={`q-body-${lessonId ?? "c"}`}>
              Detalhes
            </label>
            <textarea className="textarea" id={`q-body-${lessonId ?? "c"}`} name="body" required minLength={5} maxLength={4000} placeholder="O que tentaste? Onde ficaste com dúvidas?" />
          </div>
          <div>
            <SubmitButton pendingLabel="A publicar…">Publicar pergunta</SubmitButton>
          </div>
        </ActionForm>
      </details>
      {questions.length === 0 ? (
        <EmptyState icon="message" title="Ainda não há perguntas">
          Sê o primeiro a perguntar. O instrutor recebe uma notificação.
        </EmptyState>
      ) : (
        <div>
          {questions.map((q) => (
            <article key={q.id} className="qa-item">
              <div className="row" style={{ ["--gap" as string]: "10px" }}>
                <Avatar name={q.userName} size={32} />
                <div className="stack" style={{ ["--gap" as string]: "0px" }}>
                  <strong>{q.title}</strong>
                  <span className="xsmall faint">
                    {q.userName} · {formatRelative(q.createdAt)}
                    {showLesson && q.lessonTitle ? ` · ${q.lessonTitle}` : ""}
                  </span>
                </div>
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{q.body}</p>
              {q.answers.map((a) => (
                <div key={a.id} className={`qa-answer${a.isInstructor ? " instructor" : ""}`}>
                  <span className="xsmall">
                    <strong>{a.userName}</strong>
                    {a.isInstructor && <span className="badge badge-accent" style={{ marginLeft: 8 }}>Instrutor</span>}
                    {a.isStaff && !a.isInstructor && <span className="badge" style={{ marginLeft: 8 }}>Equipa Kuvona</span>}
                    <span className="faint"> · {formatRelative(a.createdAt)}</span>
                  </span>
                  <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
                </div>
              ))}
              <details>
                <summary className="small" style={{ cursor: "pointer", color: "var(--saffron)", fontWeight: 600 }}>
                  Responder
                </summary>
                <ActionForm action={answerQuestionAction.bind(null, q.id)} className="stack" resetOnSuccess>
                  <textarea className="textarea" name="body" required minLength={2} maxLength={4000} style={{ minHeight: 90, marginTop: 10 }} aria-label="Resposta" />
                  <div>
                    <SubmitButton className="btn btn-sm" pendingLabel="A publicar…">
                      Publicar resposta
                    </SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
