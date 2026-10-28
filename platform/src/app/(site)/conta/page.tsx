import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  updateProfileAction,
  changePasswordAction,
  resendVerificationAction,
} from "@/actions/auth";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { Avatar, Notice } from "@/components/ui";
import { Icon } from "@/components/icon";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = {
  title: "A minha conta",
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const session = await requireUserPage("/conta");
  const [user] = await (await getDb())
    .select({
      name: users.name,
      email: users.email,
      headline: users.headline,
      bio: users.bio,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  if (!user) notFound();
  return (
    <div className="container section">
      <header className="section-heading">
        <div>
          <span className="eyebrow">O teu espaço</span>
          <h1 className="display-2" style={{ marginBlock: 16 }}>
            A minha conta
          </h1>
          <p className="lead">
            Cuida do teu perfil e mantém o acesso à aprendizagem seguro.
          </p>
        </div>
        <Avatar name={user.name} size={64} />
      </header>
      <div className={styles.account}>
        <div className={styles.accountMain}>
          <section className={styles.card} id="perfil">
            <div className={styles.formHeading}>
              <Icon name="user" size={22} />
              <h2 className="h2">O teu perfil</h2>
            </div>
            <p className={styles.fieldHelp}>
              O nome identifica-te nos cursos, nas interações e nos
              certificados. Se fores instrutor, a apresentação e a biografia
              podem aparecer no teu perfil público.
            </p>
            <ActionForm action={updateProfileAction} className={styles.fields}>
              <div className="field">
                <label className="label" htmlFor="profile-name">
                  Nome
                </label>
                <input
                  className="input"
                  id="profile-name"
                  name="name"
                  defaultValue={user.name}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
                <FieldError name="name" />
              </div>
              <div className="field">
                <label className="label" htmlFor="headline">
                  Apresentação curta
                </label>
                <input
                  className="input"
                  id="headline"
                  name="headline"
                  defaultValue={user.headline ?? ""}
                  maxLength={120}
                  placeholder="Uma frase sobre o teu percurso"
                />
                <FieldError name="headline" />
              </div>
              <div className="field">
                <label className="label" htmlFor="bio">
                  Sobre ti
                </label>
                <textarea
                  className="textarea"
                  id="bio"
                  name="bio"
                  defaultValue={user.bio ?? ""}
                  maxLength={2000}
                />
                <FieldError name="bio" />
              </div>
              <SubmitButton pendingLabel="A guardar o perfil…">
                Guardar perfil
              </SubmitButton>
            </ActionForm>
          </section>
          <section className={styles.card} id="seguranca">
            <div className={styles.formHeading}>
              <Icon name="lock" size={22} />
              <h2 className="h2">Segurança</h2>
            </div>
            <p className={styles.fieldHelp}>
              Ao mudar a palavra-passe, as outras sessões da conta são
              terminadas. Esta sessão mantém-se aberta.
            </p>
            <ActionForm
              action={changePasswordAction}
              className={styles.fields}
              resetOnSuccess
            >
              <div className="field">
                <label className="label" htmlFor="current-password">
                  Palavra-passe atual
                </label>
                <input
                  id="current-password"
                  name="current"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                />
                <FieldError name="current" />
              </div>
              <div className="field">
                <label className="label" htmlFor="new-password">
                  Nova palavra-passe
                </label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                />
                <span className={styles.fieldHelp}>
                  Pelo menos 8 caracteres. Escolhe uma palavra-passe que não
                  uses noutro serviço.
                </span>
                <FieldError name="password" />
              </div>
              <div className="field">
                <label className="label" htmlFor="confirm-password">
                  Confirmar nova palavra-passe
                </label>
                <input
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                />
                <FieldError name="confirm" />
              </div>
              <SubmitButton pendingLabel="A alterar a palavra-passe…">
                Alterar palavra-passe
              </SubmitButton>
            </ActionForm>
            <Link
              className="link small"
              href="/recuperar"
              style={{ display: "inline-block", marginTop: 18 }}
            >
              Não te lembras da palavra-passe atual?
            </Link>
          </section>
        </div>
        <aside className={styles.aside}>
          <section className={styles.card} id="email">
            <div className={styles.formHeading}>
              <Icon name="mail" size={22} />
              <h2 className="h2">O teu email</h2>
            </div>
            <p className={styles.email}>{user.email}</p>
            {user.emailVerifiedAt ? (
              <Notice tone="success">Email confirmado.</Notice>
            ) : (
              <>
                <Notice tone="warning">
                  O email ainda não foi confirmado. Abre a ligação enviada para
                  a tua caixa de entrada.
                </Notice>
                <ActionForm
                  action={resendVerificationAction}
                  className={styles.fields}
                >
                  <SubmitButton
                    className="btn btn-outline btn-block"
                    pendingLabel="A enviar ligação…"
                  >
                    Reenviar confirmação
                  </SubmitButton>
                </ActionForm>
              </>
            )}
            <p className={styles.fieldHelp} style={{ marginTop: 18 }}>
              Confirma o endereço para receber as comunicações da academia.
              Verifica também a pasta de spam.
            </p>
          </section>
          <section className={styles.card}>
            <h2 className="h3">Continua o teu percurso</h2>
            <div className={styles.fields}>
              <Link className="link" href="/aprender">
                A minha aprendizagem
              </Link>
              <Link className="link" href="/desejos">
                Lista de desejos
              </Link>
              <Link className="link" href="/pedidos">
                Os meus pedidos
              </Link>
              <Link className="link" href="/sobre#apoio">
                Preciso de ajuda
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
