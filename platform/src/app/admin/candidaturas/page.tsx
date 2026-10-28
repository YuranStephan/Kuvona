import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { decideApplicationAction } from "@/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/workspace";
import { Avatar, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { instructorApplications, users } from "@/server/db/schema";

export const metadata: Metadata = { title: "Candidaturas" };

const statusLabel = { pending: "Pendente", approved: "Aprovada", rejected: "Recusada" } as const;

export default async function ApplicationsPage() {
  const rows = await (await getDb())
    .select({ app: instructorApplications, name: users.name, email: users.email })
    .from(instructorApplications)
    .innerJoin(users, eq(users.id, instructorApplications.userId))
    .orderBy(desc(instructorApplications.createdAt))
    .limit(100);
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Candidaturas a instrutor">
        Pedidos feitos em “Ensinar na Kuvona”. Aprovar dá à conta acesso à área do instrutor; a pessoa recebe um email.
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon="sparkle" title="Sem candidaturas" />
      ) : (
        <div className="stack" style={{ ["--gap" as string]: "14px" }}>
          {rows.map(({ app, name, email }) => (
            <article key={app.id} className="card card-pad stack" style={{ ["--gap" as string]: "12px" }}>
              <div className="spread">
                <div className="row" style={{ ["--gap" as string]: "12px" }}>
                  <Avatar name={name} size={42} />
                  <div className="stack" style={{ ["--gap" as string]: "0" }}>
                    <strong>{name}</strong>
                    <span className="small muted">
                      {email} · {formatDateTime(app.createdAt)}
                    </span>
                  </div>
                </div>
                <span className={`badge ${app.status === "approved" ? "badge-success" : app.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                  {statusLabel[app.status]}
                </span>
              </div>
              <div>
                <strong className="small">Área:</strong> {app.expertise}
              </div>
              <p style={{ whiteSpace: "pre-wrap", color: "var(--ink-3)" }}>{app.motivation}</p>
              {app.links && <p className="small">Links: {app.links}</p>}
              {app.decisionNote && <p className="small muted">Nota: {app.decisionNote}</p>}
              {app.status === "pending" && (
                <div className="row" style={{ alignItems: "flex-end" }}>
                  <ActionForm action={decideApplicationAction.bind(null, app.id, true)} className="row">
                    <input className="input" name="note" placeholder="Mensagem de boas-vindas (opcional)" style={{ minWidth: 260 }} />
                    <SubmitButton className="btn btn-teal btn-sm" pendingLabel="…">
                      Aprovar
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={decideApplicationAction.bind(null, app.id, false)} className="row">
                    <input className="input" name="note" placeholder="Motivo (enviado por email)" style={{ minWidth: 220 }} />
                    <SubmitButton className="btn btn-danger-outline btn-sm" pendingLabel="…">
                      Recusar
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
