import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLessonAction, updateLessonAction } from "@/actions/studio";
import {
  ActionForm,
  ConfirmSubmit,
  FieldError,
  PairsInput,
  SubmitButton,
} from "@/components/forms";
import { Markdown } from "@/components/markdown";
import { Icon } from "@/components/icon";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";
import { loadEditor } from "../../editor";

export default async function LessonEditor({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const { course, outline } = await loadEditor(id);
  const lesson = outline
    .flatMap((m) => m.lessons)
    .find((l) => l.id === lessonId);
  if (!lesson) notFound();
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <Link
        href={`/instrutor/cursos/${id}/curriculo`}
        className="row small link"
        style={{ ["--gap" as string]: "6px" }}
      >
        <Icon name="arrowLeft" size={16} /> Voltar ao currículo
      </Link>
      <ActionForm
        action={updateLessonAction.bind(null, lesson.id)}
        className="editor-grid"
      >
        <div className="stack" style={{ ["--gap" as string]: "24px" }}>
          <section className="form-section">
            <h2>Editar aula</h2>
            <div className="field">
              <label className="label" htmlFor="title">
                Título
              </label>
              <input
                className="input"
                name="title"
                id="title"
                defaultValue={lesson.title}
                required
                maxLength={160}
              />
              <FieldError name="title" />
            </div>
            <div className="field">
              <label className="label" htmlFor="summary">
                Resumo
              </label>
              <textarea
                className="textarea"
                name="summary"
                id="summary"
                defaultValue={lesson.summary}
                maxLength={400}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="youtubeUrl">
                Vídeo YouTube
              </label>
              <input
                className="input"
                name="youtubeUrl"
                id="youtubeUrl"
                defaultValue={
                  lesson.youtubeVideoId
                    ? youTubeWatchUrl(lesson.youtubeVideoId)
                    : ""
                }
                placeholder="https://www.youtube.com/watch?v=…"
                maxLength={300}
              />
              <FieldError name="youtubeUrl" />
              <span className="hint">
                Usa um vídeo que tenhas autorização para disponibilizar. Deixa
                vazio para uma aula em texto.
              </span>
            </div>
            <div className="field">
              <label className="label" htmlFor="videoSource">
                Autoria ou fonte do vídeo
              </label>
              <input
                className="input"
                name="videoSource"
                id="videoSource"
                defaultValue={lesson.videoSource ?? ""}
                maxLength={120}
                placeholder="Nome do canal ou autor"
              />
            </div>
            {lesson.youtubeVideoId && (
              <div className="yt-preview">
                <img
                  src={youTubeThumbnail(lesson.youtubeVideoId)}
                  alt="Miniatura do vídeo guardado"
                  width={320}
                  height={180}
                />
                <div>
                  <strong>Vídeo guardado</strong>
                  <p className="small muted">
                    A miniatura atualiza depois de guardares as alterações.
                  </p>
                  <a
                    className="link small"
                    href={youTubeWatchUrl(lesson.youtubeVideoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver no YouTube
                  </a>
                </div>
              </div>
            )}
          </section>
          <section className="form-section">
            <h2>Conteúdo e atividade</h2>
            <div className="field">
              <label className="label" htmlFor="body">
                Texto da aula
              </label>
              <textarea
                className="textarea"
                id="body"
                name="body"
                defaultValue={lesson.body}
                maxLength={20000}
                style={{ minHeight: 300 }}
              />
              <span className="hint">
                Markdown simples: ## título, - lista, **negrito** e links https.
                Uma aula sem vídeo precisa de pelo menos 40 caracteres para
                publicar.
              </span>
            </div>
            <div className="field">
              <label className="label" htmlFor="task">
                Atividade prática
              </label>
              <textarea
                className="textarea"
                id="task"
                name="task"
                defaultValue={lesson.task}
                maxLength={2000}
              />
            </div>
            <div className="field">
              <span className="label">Materiais e recursos</span>
              <PairsInput
                name="resources"
                initial={lesson.resources.map(
                  (r) => [r.title, r.url] as [string, string],
                )}
                labels={["Título", "https://…"]}
                max={12}
              />
              <span className="hint">Só são aceites endereços https://.</span>
            </div>
          </section>
        </div>
        <aside className="form-section">
          <h2>Disponibilidade</h2>
          <div className="field">
            <label className="label" htmlFor="durationMinutes">
              Duração (minutos)
            </label>
            <input
              className="input"
              name="durationMinutes"
              id="durationMinutes"
              type="number"
              min={0}
              max={600}
              step={1}
              defaultValue={Math.ceil(lesson.durationSeconds / 60)}
              required
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              name="isPreview"
              defaultChecked={lesson.isPreview}
            />
            <span>Aula de pré-visualização gratuita</span>
          </label>
          <p className="hint">
            Todo o conteúdo desta aula fica público quando esta opção está ativa
            e o curso está publicado.
          </p>
          <SubmitButton className="btn btn-block">Guardar aula</SubmitButton>
        </aside>
      </ActionForm>
      {lesson.body && (
        <details className="form-section">
          <summary className="link">Pré-visualização do texto guardado</summary>
          <Markdown text={lesson.body} />
        </details>
      )}
      <section className="form-section">
        <h2>Apagar aula</h2>
        <p className="small muted">
          Se houver progresso de estudantes, a aula fica protegida contra
          eliminação.
        </p>
        <ActionForm
          action={deleteLessonAction.bind(null, lesson.id, course.id)}
        >
          <ConfirmSubmit
            label="Apagar esta aula"
            title={`Apagar “${lesson.title}”?`}
            description="Esta ação remove a aula e os seus materiais do curso."
            confirmLabel="Apagar aula"
          />
        </ActionForm>
      </section>
    </div>
  );
}
