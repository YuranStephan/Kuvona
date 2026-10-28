import type { Metadata } from "next";
import { resetPasswordAction } from "@/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Nova palavra-passe" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <h1 className="h1">Nova palavra-passe</h1>
        <p className="muted">Escolhe uma palavra-passe nova. As sessões abertas noutros dispositivos serão terminadas.</p>
      </div>
      <ActionForm action={resetPasswordAction.bind(null, token)} className="stack">
        <div className="field">
          <label className="label" htmlFor="password">
            Nova palavra-passe
          </label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="field">
          <label className="label" htmlFor="confirm">
            Confirmar
          </label>
          <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <SubmitButton className="btn btn-lg btn-block" pendingLabel="A guardar…">
          Guardar e entrar
        </SubmitButton>
      </ActionForm>
    </>
  );
}
