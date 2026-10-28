import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/actions/auth";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { safeNextPath } from "@/lib/text";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <h1 className="h1">Cria a tua conta</h1>
        <p className="muted">
          Já tens conta?{" "}
          <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="link">
            Entra aqui
          </Link>
        </p>
      </div>
      <ActionForm action={registerAction} className="stack">
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label className="label" htmlFor="name">
            Nome completo
          </label>
          <input className="input" id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
          <span className="hint">Aparece no teu certificado.</span>
          <FieldError name="name" />
        </div>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          <FieldError name="email" />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">
            Palavra-passe
          </label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <span className="hint">Pelo menos 8 caracteres.</span>
          <FieldError name="password" />
        </div>
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span className="small">
            Aceito os{" "}
            <Link href="/termos" className="link" target="_blank">
              termos de utilização
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="link" target="_blank">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        <SubmitButton className="btn btn-lg btn-block btn-accent" pendingLabel="A criar conta…">
          Criar conta grátis
        </SubmitButton>
      </ActionForm>
    </>
  );
}
