import { updateCourseAction } from "@/actions/studio";
import { CourseCover } from "@/components/cover";
import { courseImages } from "@/lib/course-images";
import {
  ActionForm,
  FieldError,
  ListInput,
  PairsInput,
  SubmitButton,
} from "@/components/forms";
import { levelLabel } from "@/lib/format";
import { youTubeWatchUrl } from "@/lib/youtube";
import { loadEditor } from "./editor";

export default async function CourseDetailsEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, categories } = await loadEditor(id);
  const price = course.priceCents
    ? String(course.priceCents / 100).replace(".", ",")
    : "0";
  return (
    <ActionForm
      action={updateCourseAction.bind(null, course.id)}
      className="editor-grid"
    >
      <div className="stack" style={{ ["--gap" as string]: "22px" }}>
        <section className="form-section">
          <h2>Apresentação</h2>
          <div className="field">
            <label className="label" htmlFor="title">
              Título
            </label>
            <input
              className="input"
              id="title"
              name="title"
              defaultValue={course.title}
              required
              minLength={4}
              maxLength={120}
            />
            <FieldError name="title" />
          </div>
          <div className="field">
            <label className="label" htmlFor="subtitle">
              Subtítulo
            </label>
            <input
              className="input"
              id="subtitle"
              name="subtitle"
              defaultValue={course.subtitle}
              maxLength={200}
              placeholder="Uma frase sobre o resultado do curso"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="description">
              Descrição
            </label>
            <textarea
              className="textarea"
              id="description"
              name="description"
              defaultValue={course.description}
              style={{ minHeight: 180 }}
              maxLength={8000}
            />
            <span className="hint">
              Parágrafos separados por uma linha em branco. Mínimo 80 caracteres
              para publicar.
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="trailerUrl">
              Trailer (link YouTube, opcional)
            </label>
            <input
              className="input"
              id="trailerUrl"
              name="trailerUrl"
              defaultValue={
                course.trailerYoutubeId
                  ? youTubeWatchUrl(course.trailerYoutubeId)
                  : ""
              }
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <span className="hint">
              Aparece como imagem na página do curso. Para uma aula gratuita,
              marca uma aula como pré-visualização no currículo.
            </span>
          </div>
        </section>

        <section className="form-section">
          <h2>O que os estudantes vão aprender</h2>
          <div className="field">
            <span className="label">Objetivos (mínimo 2)</span>
            <ListInput
              name="outcomes"
              initial={course.outcomes}
              placeholder="ex.: Criar uma folha de orçamento mensal"
            />
          </div>
          <div className="field">
            <span className="label">Competências</span>
            <ListInput
              name="skills"
              initial={course.skills}
              placeholder="ex.: Excel"
              max={10}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="project">
              Projeto final
            </label>
            <textarea
              className="textarea"
              id="project"
              name="project"
              defaultValue={course.project}
              style={{ minHeight: 80 }}
              maxLength={600}
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Para quem é</h2>
          <div className="field">
            <span className="label">Requisitos</span>
            <ListInput
              name="requirements"
              initial={course.requirements}
              placeholder="ex.: Um telemóvel ou computador"
              max={10}
            />
          </div>
          <div className="field">
            <span className="label">Público-alvo</span>
            <ListInput
              name="audience"
              initial={course.audience}
              placeholder="ex.: Pequenos empreendedores"
              max={10}
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Perguntas frequentes</h2>
          <PairsInput
            name="faq"
            initial={course.faq.map((f) => [f.q, f.a] as [string, string])}
            labels={["Pergunta", "Resposta"]}
            bMultiline
          />
        </section>
      </div>

      <aside
        className="stack"
        style={{ ["--gap" as string]: "22px", position: "sticky", top: 20 }}
      >
        <section className="form-section">
          <h2>Preço e nível</h2>
          <div
            style={{
              aspectRatio: "16/10",
              overflow: "hidden",
              borderRadius: "var(--r-s)",
            }}
          >
            <CourseCover seed={course.coverSeed} title={course.title} />
          </div>
          <div className="field">
            <label className="label" htmlFor="coverSeed">
              Imagem do curso
            </label>
            <select
              className="select"
              name="coverSeed"
              id="coverSeed"
              defaultValue={course.coverSeed}
            >
              {!courseImages.some(
                (image) => image.seed === course.coverSeed,
              ) && (
                <option value={course.coverSeed}>
                  Padrão próprio do curso
                </option>
              )}
              {courseImages.map((image) => (
                <option key={image.seed} value={image.seed}>
                  {image.label}
                </option>
              ))}
            </select>
            <span className="hint">
              Escolhe uma imagem da biblioteca. A capa atualiza depois de
              guardar.
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="price">
              Preço
            </label>
            <div className="input-affix">
              <input
                className="input"
                id="price"
                name="price"
                defaultValue={price}
                inputMode="decimal"
                style={{ borderRadius: "var(--r-s) 0 0 var(--r-s)" }}
              />
              <span className="affix affix-end">MT</span>
            </div>
            <span className="hint">
              0 = curso gratuito. Alterar o preço não afeta pedidos já criados.
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="categoryId">
              Categoria
            </label>
            <select
              className="select"
              id="categoryId"
              name="categoryId"
              defaultValue={course.categoryId ?? ""}
            >
              <option value="">— Escolher —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="level">
              Nível
            </label>
            <select
              className="select"
              id="level"
              name="level"
              defaultValue={course.level}
            >
              {Object.entries(levelLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="btn btn-block" pendingLabel="A guardar…">
            Guardar alterações
          </SubmitButton>
        </section>
      </aside>
    </ActionForm>
  );
}
