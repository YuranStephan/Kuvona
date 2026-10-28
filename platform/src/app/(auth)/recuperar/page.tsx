import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Notice } from "@/components/ui";
import { emailProvider } from "@/server/email";

export const metadata: Metadata = { title: "Recuperar palavra-passe" };

export default function ForgotPage() {
  return (
    <>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <h1 className="h1">Recuperar acesso</h1>
        <p className="muted">Indica o email da tua conta. Enviamos um link válido durante 1 hora.</p>
      </div>
      <ActionForm action={forgotPasswordAction} className="stack" resetOnSuccess>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <SubmitButton className="btn btn-lg btn-block" pendingLabel="A enviar…">
          Enviar link
        </SubmitButton>
      </ActionForm>
      {emailProvider() === "outbox" && (
        <Notice tone="info">Sem serviço de email configurado: as mensagens ficam na caixa de saída interna (Gestão → Emails).</Notice>
      )}
      <Link href="/entrar" className="link small">
        Voltar a entrar
      </Link>
    </>
  );
}
