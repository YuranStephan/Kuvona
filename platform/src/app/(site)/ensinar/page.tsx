import type { Metadata } from "next";
import Link from "next/link";
import { applyInstructorAction } from "@/actions/learning";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { myApplication } from "@/server/learning/community";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = {
  title: "Ensinar na Kuvona",
  description:
    "Transforma a tua experiência num percurso de aprendizagem prático em português.",
};
export default async function TeachPage() {
  const user = await getCurrentUser();
  const application = user ? await myApplication(await getDb(), user.id) : null;
  const pending = application?.status === "pending";
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <span className="eyebrow">Ensina na Kuvona</span>
          <h1 className="display-2">
            O que sabes pode ser
            <br />
            <em className="accent">o começo de alguém.</em>
          </h1>
          <p className="lead">
            Partilha experiência que se transforma em prática. Ajuda outras
            pessoas a desenvolver competências, com objetivos claros e um
            percurso bem preparado.
          </p>
        </div>
      </section>
      <section className="container section">
        <div className={styles.pageGrid}>
          <div className="stack" style={{ ["--gap" as string]: "28px" }}>
            <div className="prose">
              <h2>Ensinar começa por uma boa pergunta.</h2>
              <p>
                O que vai uma pessoa conseguir fazer depois de aprender contigo?
                Começa por um resultado concreto, organiza as etapas e prepara
                atividades que ajudem a pôr o conhecimento em prática.
              </p>
            </div>
            {[
              [
                "01",
                "Define o teu público",
                "Descreve para quem é o curso, o que precisa de saber antes e que transformação é realista alcançar.",
              ],
              [
                "02",
                "Prepara o percurso",
                "Liga os conteúdos, os materiais e as avaliações aos objetivos. As aulas em vídeo são introduzidas por link do YouTube, sem upload de vídeos para a academia.",
              ],
              [
                "03",
                "Acompanha a aprendizagem",
                "Na área do instrutor podes gerir os teus conteúdos e acompanhar os estudantes e os resultados dos teus cursos, conforme as permissões atribuídas.",
              ],
            ].map(([n, title, body]) => (
              <article key={n} className={styles.card}>
                <span className={styles.step}>{n}</span>
                <h3 className="h3">{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <aside className={styles.card}>
            <h2 className="h2">Faz parte da academia</h2>
            {!user ? (
              <>
                <p>
                  Entra na tua conta para apresentar uma candidatura. Se ainda
                  não tens conta, podes criá-la no passo seguinte.
                </p>
                <Link className="btn btn-block" href="/entrar?next=/ensinar">
                  Entrar para me candidatar <Icon name="arrowRight" size={16} />
                </Link>
                <Link
                  className="link small"
                  href="/registar?next=/ensinar"
                  style={{ display: "inline-block", marginTop: 18 }}
                >
                  Criar conta
                </Link>
              </>
            ) : user.role !== "student" ? (
              <>
                <Notice tone="success">
                  A tua conta já tem acesso à criação ou gestão de cursos.
                </Notice>
                <Link
                  className="btn btn-block"
                  href={user.role === "admin" ? "/admin" : "/instrutor"}
                  style={{ marginTop: 20 }}
                >
                  Abrir a minha área <Icon name="arrowRight" size={16} />
                </Link>
              </>
            ) : (
              <>
                {application && (
                  <div className={styles.status}>
                    <Notice
                      tone={
                        pending
                          ? "info"
                          : application.status === "approved"
                            ? "success"
                            : "warning"
                      }
                    >
                      {pending
                        ? "A tua candidatura está em análise. Não precisas de a enviar novamente."
                        : application.status === "approved"
                          ? "A candidatura foi aprovada. Atualiza a sessão para abrir a tua área."
                          : "A candidatura anterior não foi aprovada. Podes rever a proposta e voltar a candidatar-te."}
                    </Notice>
                    {application.decisionNote && (
                      <p className={styles.fieldHelp}>
                        Nota da equipa: {application.decisionNote}
                      </p>
                    )}
                  </div>
                )}
                {!pending && application?.status !== "approved" && (
                  <ActionForm
                    action={applyInstructorAction}
                    className={styles.fields}
                  >
                    <div className="field">
                      <label className="label" htmlFor="expertise">
                        A tua área de experiência
                      </label>
                      <input
                        id="expertise"
                        name="expertise"
                        className="input"
                        required
                        minLength={3}
                        maxLength={200}
                        defaultValue={application?.expertise ?? ""}
                        placeholder="Ex.: design, programação, gestão"
                      />
                      <FieldError name="expertise" />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="motivation">
                        O que gostarias de ensinar e a quem?
                      </label>
                      <textarea
                        id="motivation"
                        name="motivation"
                        className="textarea"
                        required
                        minLength={40}
                        maxLength={3000}
                        defaultValue={application?.motivation ?? ""}
                      />
                      <span className={styles.fieldHelp}>
                        Conta-nos a tua experiência, o público e o resultado do
                        curso. Pelo menos 40 caracteres.
                      </span>
                      <FieldError name="motivation" />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="links">
                        Portefólio ou ligações (opcional)
                      </label>
                      <textarea
                        id="links"
                        name="links"
                        className="textarea"
                        maxLength={500}
                        defaultValue={application?.links ?? ""}
                        style={{ minHeight: 85 }}
                      />
                      <FieldError name="links" />
                    </div>
                    <SubmitButton
                      className="btn btn-block"
                      pendingLabel="A enviar candidatura…"
                    >
                      Enviar candidatura <Icon name="arrowRight" size={16} />
                    </SubmitButton>
                  </ActionForm>
                )}
                <p className={styles.fieldHelp} style={{ marginTop: 20 }}>
                  A candidatura é analisada pela equipa. Não implica publicação
                  automática, rendimentos garantidos ou uma decisão sobre
                  comissões.
                </p>
              </>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
