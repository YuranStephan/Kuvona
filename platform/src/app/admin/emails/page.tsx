import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/workspace";
import { EmptyState, Notice } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { emailOutbox } from "@/server/db/schema";
import { emailProvider } from "@/server/email";

export const metadata: Metadata = { title: "Emails" };

export default async function EmailsPage() {
  const rows = await (await getDb()).select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(100);
  const provider = emailProvider();
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Emails enviados">
        Registo de todas as mensagens da plataforma (confirmação de conta, recuperação de palavra-passe, pagamentos, perguntas).
      </PageHeader>
      {provider === "outbox" ? (
        <Notice tone="warning">
          Nenhum serviço de email configurado: as mensagens ficam apenas aqui. Define <span className="mono">RESEND_API_KEY</span> e{" "}
          <span className="mono">EMAIL_FROM</span> para as enviar de verdade.
        </Notice>
      ) : (
        <Notice tone="success">Envio real ativo via Resend.</Notice>
      )}
      {rows.length === 0 ? (
        <EmptyState icon="mail" title="Ainda não foram enviados emails" />
      ) : (
        <div className="stack" style={{ ["--gap" as string]: "10px" }}>
          {rows.map((m) => (
            <details key={m.id} className="card card-pad">
              <summary className="spread" style={{ cursor: "pointer", listStyle: "none" }}>
                <span className="stack" style={{ ["--gap" as string]: "2px" }}>
                  <strong>{m.subject}</strong>
                  <span className="small muted">
                    Para {m.toEmail} · {formatDateTime(m.createdAt)}
                  </span>
                </span>
                <span className={`badge ${m.error ? "badge-danger" : m.sentAt ? "badge-success" : ""}`}>
                  {m.error ? "Falhou" : m.sentAt ? "Enviado" : "Só registo"}
                </span>
              </summary>
              {m.error && <p className="small" style={{ color: "var(--danger)", marginTop: 10 }}>{m.error}</p>}
              <pre className="email-body" style={{ marginTop: 12 }}>
                {m.text}
              </pre>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
