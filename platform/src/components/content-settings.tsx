import { saveContentSettingsAction } from "@/actions/admin";
import {
  ActionForm,
  FieldError,
  PairsInput,
  SubmitButton,
} from "@/components/forms";
import { Notice } from "@/components/ui";
import type { ContentSettings } from "@/server/settings";

export function ContentSettingsForm({ content }: { content: ContentSettings }) {
  return (
    <section className="form-section" id="conteudos">
      <h2>Conteúdos do site</h2>
      <p className="small muted">
        Edita a apresentação da academia, as perguntas frequentes e os textos
        legais. As alterações ficam públicas depois de guardar.
      </p>
      <ActionForm action={saveContentSettingsAction} className="stack">
        <details open className="form-section">
          <summary className="h3">Página inicial</summary>
          <div className="field">
            <label className="label" htmlFor="heroTitle">
              Título principal
            </label>
            <textarea
              className="textarea"
              id="heroTitle"
              name="heroTitle"
              defaultValue={content.heroTitle}
              minLength={4}
              maxLength={140}
              required
            />
            <FieldError name="heroTitle" />
            <span className="hint">
              Usa uma quebra de linha para dividir o título.
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="heroSubtitle">
              Apresentação
            </label>
            <textarea
              className="textarea"
              id="heroSubtitle"
              name="heroSubtitle"
              defaultValue={content.heroSubtitle}
              minLength={10}
              maxLength={600}
              required
            />
          </div>
          <div className="field">
            <span className="label">Perguntas frequentes</span>
            <PairsInput
              name="homeFaq"
              labels={["Pergunta", "Resposta"]}
              initial={content.homeFaq.map(
                (f) => [f.q, f.a] as [string, string],
              )}
              bMultiline
              max={12}
            />
          </div>
        </details>
        <details className="form-section">
          <summary className="h3">Sobre a academia</summary>
          <div className="field">
            <label className="label" htmlFor="aboutTitle">
              Título da página Sobre
            </label>
            <textarea
              className="textarea"
              id="aboutTitle"
              name="aboutTitle"
              defaultValue={content.aboutTitle}
              minLength={4}
              maxLength={160}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="aboutIntro">
              Introdução
            </label>
            <textarea
              className="textarea"
              id="aboutIntro"
              name="aboutIntro"
              defaultValue={content.aboutIntro}
              minLength={10}
              maxLength={600}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="aboutBody">
              Texto completo
            </label>
            <textarea
              className="textarea"
              id="aboutBody"
              name="aboutBody"
              defaultValue={content.aboutBody}
              style={{ minHeight: 280 }}
              minLength={40}
              maxLength={20000}
              required
            />
            <span className="hint">
              Markdown: ## título, - lista, **negrito**. HTML não é executado.
            </span>
          </div>
        </details>
        <details className="form-section">
          <summary className="h3">Termos, privacidade e reembolsos</summary>
          <Notice tone="warning">
            Os textos iniciais são rascunhos. Revê-os com um jurista e aprova as
            condições comerciais antes de aceitar pagamentos reais. O aviso de
            rascunho continua visível nas páginas.
          </Notice>
          {(
            [
              ["terms", "Termos de utilização"],
              ["privacy", "Privacidade"],
              ["refunds", "Política de reembolso"],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              <textarea
                className="textarea"
                id={key}
                name={key}
                defaultValue={content[key]}
                minLength={80}
                maxLength={30000}
                required
                style={{ minHeight: 300 }}
              />
              <FieldError name={key} />
            </div>
          ))}
        </details>
        <div>
          <SubmitButton>Guardar conteúdos do site</SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}
