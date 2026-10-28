import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { roleLabel } from "@/lib/format";
import { safeNextPath } from "@/lib/text";
import { getCurrentUser } from "@/server/auth/session";
import { isLocalMode } from "@/server/config";
import { LOCAL_ACCOUNTS } from "@/server/seed/seed";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <h1 className="h1">Bem-vindo de volta</h1>
        <p className="muted">
          Ainda não tens conta?{" "}
          <Link href={`/registar?next=${encodeURIComponent(next)}`} className="link">
            Cria uma grátis
          </Link>
        </p>
      </div>
      <ActionForm action={loginAction} className="stack">
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          <FieldError name="email" />
        </div>
        <div className="field">
          <div className="spread">
            <label className="label" htmlFor="password">
              Palavra-passe
            </label>
            <Link href="/recuperar" className="small link-quiet">
              Esqueceste-te?
            </Link>
          </div>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          <FieldError name="password" />
        </div>
        <SubmitButton className="btn btn-lg btn-block" pendingLabel="A entrar…">
          Entrar
        </SubmitButton>
      </ActionForm>
      {isLocalMode() && (
        <div className="demo-accounts">
          <strong>Contas de teste (apenas neste computador)</strong>
          <table>
            <tbody>
              {LOCAL_ACCOUNTS.map((a) => (
                <tr key={a.email}>
                  <td className="muted">{roleLabel[a.role]}</td>
                  <td className="mono">{a.email}</td>
                  <td className="mono">{a.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="xsmall muted">Estas contas só existem na base de dados local. Num servidor real não são criadas.</span>
        </div>
      )}
    </>
  );
}
