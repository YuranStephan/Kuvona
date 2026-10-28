import Link from "next/link";
import { and, isNull, inArray } from "drizzle-orm";
import {
  publishCourseAction,
  reassignInstructorAction,
  requestChangesAction,
  setCourseStatusAction,
} from "@/actions/admin";
import {
  submitForReviewAction,
  withdrawFromReviewAction,
} from "@/actions/studio";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { loadEditor } from "../editor";

export default async function PublicationEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, user, problems, questions } = await loadEditor(id);
  const instructors =
    user.role === "admin"
      ? await (
          await getDb()
        )
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(
            and(
              inArray(users.role, ["admin", "instructor"]),
              isNull(users.disabledAt),
            ),
          )
          .orderBy(users.name)
      : [];
  return (
    <div className="editor-grid">
      <div className="stack" style={{ ["--gap" as string]: "24px" }}>
        <section className="form-section">
          <h2>Preparar a publicação</h2>
          <p className="small muted">
            A gestão revê o curso antes de o disponibilizar no catálogo. As
            alterações guardadas num curso publicado ficam disponíveis aos
            estudantes.
          </p>
          {course.reviewNote && (
            <Notice tone="warning">
              <strong>Feedback da gestão</strong>
              <p>{course.reviewNote}</p>
            </Notice>
          )}
          <ul className="checklist">
            {problems.length ? (
              problems.map((p) => (
                <li key={p}>
                  <Icon name="circle" className="no" size={18} />
                  <span>{p}</span>
                </li>
              ))
            ) : (
              <li>
                <Icon name="checkCircle" className="ok" size={18} />
                <span>Os requisitos de publicação estão completos.</span>
              </li>
            )}
          </ul>
          {!questions.length && (
            <Notice>
              A avaliação final é opcional. Neste curso, o certificado depende
              da conclusão de todas as aulas. Adiciona perguntas no separador
              Avaliação para exigir também uma nota mínima de 70%.
            </Notice>
          )}
          <div className="row">
            <Link
              className="btn btn-outline btn-sm"
              href={`/instrutor/cursos/${id}`}
            >
              Editar detalhes
            </Link>
            <Link
              className="btn btn-outline btn-sm"
              href={`/instrutor/cursos/${id}/curriculo`}
            >
              Editar currículo
            </Link>
          </div>
        </section>
        <section className="form-section">
          <h2>Estado do curso</h2>
          {course.status === "draft" && (
            <>
              <p>Quando terminares, envia o curso à equipa para revisão.</p>
              <ActionForm action={submitForReviewAction.bind(null, course.id)}>
                <SubmitButton>Enviar para revisão</SubmitButton>
              </ActionForm>
            </>
          )}
          {course.status === "in_review" && (
            <>
              <Notice>O curso está na fila de revisão da gestão.</Notice>
              <ActionForm
                action={withdrawFromReviewAction.bind(null, course.id)}
              >
                <SubmitButton className="btn btn-outline">
                  Voltar a rascunho
                </SubmitButton>
              </ActionForm>
            </>
          )}
          {course.status === "published" && (
            <>
              <Notice tone="success">O curso está publicado.</Notice>
              <Link className="btn btn-outline" href={`/cursos/${course.slug}`}>
                Ver na loja <Icon name="external" size={16} />
              </Link>
            </>
          )}
          {course.status === "archived" && (
            <Notice>
              O curso está arquivado. Contacta a gestão para voltar a
              disponibilizá-lo.
            </Notice>
          )}
        </section>
      </div>
      <aside className="stack" style={{ ["--gap" as string]: "24px" }}>
        {user.role === "admin" ? (
          <>
            <section className="form-section">
              <h2>Decisão da gestão</h2>
              <ActionForm action={publishCourseAction.bind(null, course.id)}>
                <SubmitButton className="btn btn-block">
                  {course.status === "published"
                    ? "Confirmar publicação"
                    : "Publicar curso"}
                </SubmitButton>
              </ActionForm>
              <ActionForm
                action={requestChangesAction.bind(null, course.id)}
                className="stack"
              >
                <div className="field">
                  <label className="label" htmlFor="note">
                    Alterações necessárias
                  </label>
                  <textarea
                    className="textarea"
                    name="note"
                    id="note"
                    required
                    minLength={5}
                    maxLength={1500}
                  />
                </div>
                <SubmitButton className="btn btn-outline">
                  Pedir alterações
                </SubmitButton>
              </ActionForm>
              <ActionForm
                action={setCourseStatusAction.bind(null, course.id, "draft")}
              >
                <ConfirmSubmit
                  label="Retirar da loja"
                  title="Retirar o curso da loja?"
                  description="O curso volta a rascunho. Os estudantes inscritos mantêm o acesso."
                  tone="primary"
                  confirmLabel="Retirar da loja"
                />
              </ActionForm>
            </section>
            <section className="form-section">
              <h2>Instrutor responsável</h2>
              <ActionForm
                action={reassignInstructorAction.bind(null, course.id)}
                className="stack"
              >
                <label className="sr-only" htmlFor="instructorId">
                  Instrutor
                </label>
                <select
                  className="select"
                  name="instructorId"
                  id="instructorId"
                  defaultValue={course.instructorId}
                >
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · {i.email}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn btn-outline">
                  Alterar responsável
                </SubmitButton>
              </ActionForm>
            </section>
          </>
        ) : (
          <section className="form-section">
            <h2>Uma revisão com contexto</h2>
            <p className="small muted">
              Verifica os objetivos, o conteúdo, os direitos dos vídeos e o
              preço. A gestão pode pedir alterações antes de publicar.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
