import Link from "next/link";
import {
  addLessonAction,
  addModuleAction,
  deleteModuleAction,
  moveLessonAction,
  moveModuleAction,
  renameModuleAction,
} from "@/actions/studio";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { loadEditor } from "../editor";

export default async function CurriculumEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, outline } = await loadEditor(id);
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <Notice>
        Organiza o percurso em módulos e aulas. Abre uma aula para adicionar o
        vídeo YouTube, os materiais e a atividade. As setas mudam a ordem dentro
        do módulo.
      </Notice>
      {outline.map((mod, mi) => (
        <section className="module-card" key={mod.id}>
          <header className="module-card-head">
            <span className="n">{String(mi + 1).padStart(2, "0")}</span>
            <h2 className="h3" style={{ flex: 1 }}>
              {mod.title}
            </h2>
            <span className="small muted">{mod.lessons.length} aulas</span>
            <div className="icon-btns">
              <form action={moveModuleAction.bind(null, mod.id, "up")}>
                <button
                  className="btn btn-ghost btn-xs"
                  aria-label={`Subir módulo ${mod.title}`}
                  disabled={mi === 0}
                >
                  <Icon name="chevronUp" size={18} />
                </button>
              </form>
              <form action={moveModuleAction.bind(null, mod.id, "down")}>
                <button
                  className="btn btn-ghost btn-xs"
                  aria-label={`Descer módulo ${mod.title}`}
                  disabled={mi === outline.length - 1}
                >
                  <Icon name="chevronDown" size={18} />
                </button>
              </form>
            </div>
          </header>
          <div style={{ padding: "14px 18px" }} className="stack">
            <ActionForm
              action={renameModuleAction.bind(null, mod.id)}
              className="row"
            >
              <label className="sr-only" htmlFor={`module-${mod.id}`}>
                Título do módulo
              </label>
              <input
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                id={`module-${mod.id}`}
                name="title"
                defaultValue={mod.title}
                required
                maxLength={120}
              />
              <SubmitButton className="btn btn-outline btn-sm">
                Renomear
              </SubmitButton>
            </ActionForm>
          </div>
          {mod.lessons.map((lesson, li) => (
            <div className="lesson-item" key={lesson.id}>
              <Icon name={lesson.youtubeVideoId ? "video" : "text"} size={18} />
              <Link
                className="title"
                href={`/instrutor/cursos/${course.id}/aulas/${lesson.id}`}
              >
                {lesson.title}
              </Link>
              {lesson.isPreview && (
                <span className="badge badge-teal">Pré-visualização</span>
              )}
              <span className="small muted">
                {formatDuration(lesson.durationSeconds)}
              </span>
              <div className="icon-btns">
                <form action={moveLessonAction.bind(null, lesson.id, "up")}>
                  <button
                    className="btn btn-ghost btn-xs"
                    aria-label={`Subir aula ${lesson.title}`}
                    disabled={li === 0}
                  >
                    <Icon name="chevronUp" size={17} />
                  </button>
                </form>
                <form action={moveLessonAction.bind(null, lesson.id, "down")}>
                  <button
                    className="btn btn-ghost btn-xs"
                    aria-label={`Descer aula ${lesson.title}`}
                    disabled={li === mod.lessons.length - 1}
                  >
                    <Icon name="chevronDown" size={17} />
                  </button>
                </form>
              </div>
            </div>
          ))}
          {mod.lessons.length === 0 && (
            <p className="small muted" style={{ padding: "12px 18px" }}>
              Este módulo ainda não tem aulas.
            </p>
          )}
          <div className="stack" style={{ padding: 18 }}>
            <ActionForm
              action={addLessonAction.bind(null, mod.id)}
              resetOnSuccess
              className="row"
            >
              <label className="sr-only" htmlFor={`lesson-${mod.id}`}>
                Título da nova aula em {mod.title}
              </label>
              <input
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                id={`lesson-${mod.id}`}
                name="title"
                placeholder="Título da nova aula"
                required
                maxLength={160}
              />
              <SubmitButton className="btn btn-soft btn-sm">
                <Icon name="plus" size={16} /> Adicionar aula
              </SubmitButton>
            </ActionForm>
            <ActionForm action={deleteModuleAction.bind(null, mod.id)}>
              <ConfirmSubmit
                label="Apagar módulo"
                title={`Apagar “${mod.title}”?`}
                description="As aulas deste módulo também serão apagadas. Módulos com progresso de estudantes ficam protegidos."
                confirmLabel="Apagar módulo"
              />
            </ActionForm>
          </div>
        </section>
      ))}
      <section className="form-section">
        <h2>Novo módulo</h2>
        <ActionForm
          action={addModuleAction.bind(null, course.id)}
          resetOnSuccess
          className="row"
        >
          <label className="sr-only" htmlFor="new-module">
            Título do novo módulo
          </label>
          <input
            className="input"
            id="new-module"
            name="title"
            placeholder="ex.: Pôr em prática"
            required
            maxLength={120}
            style={{ flex: 1, minWidth: 180 }}
          />
          <SubmitButton>
            <Icon name="plus" size={17} /> Adicionar módulo
          </SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
