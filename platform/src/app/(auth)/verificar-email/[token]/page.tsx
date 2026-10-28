import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { verifyEmail } from "@/server/auth/service";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";

export const metadata: Metadata = { title: "Confirmar email" };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let error: string | null = null;
  try {
    await verifyEmail(await getDb(), token);
  } catch (e) {
    error = e instanceof DomainError ? e.message : "Não foi possível confirmar o email.";
  }
  return (
    <div className="status-hero card">
      <span className={`status-icon ${error ? "bad" : "ok"}`}>
        <Icon name={error ? "alert" : "checkCircle"} size={36} />
      </span>
      <h1 className="h2">{error ? "Link inválido" : "Email confirmado"}</h1>
      <p className="muted">{error ?? "Obrigado! Vais receber recibos e certificados neste endereço."}</p>
      <Link href={error ? "/conta" : "/aprender"} className="btn">
        {error ? "Pedir um novo link" : "Ir para a minha aprendizagem"}
      </Link>
    </div>
  );
}
