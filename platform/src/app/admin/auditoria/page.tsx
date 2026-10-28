import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/workspace";
import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { auditEvents, users } from "@/server/db/schema";

export const metadata: Metadata = { title: "Auditoria" };

const actionLabel: Record<string, string> = {
  "order.paid": "Pagamento confirmado",
  "order.refunded": "Reembolso registado",
  "course.created": "Curso criado",
  "course.updated": "Curso editado",
  "course.submitted": "Curso enviado para revisão",
  "course.published": "Curso publicado",
  "course.changes_requested": "Alterações pedidas",
  "course.draft": "Curso retirado da loja",
  "course.archived": "Curso arquivado",
  "course.reassigned": "Instrutor alterado",
  "lesson.deleted": "Aula apagada",
  "module.deleted": "Módulo apagado",
  "enrollment.free": "Inscrição gratuita",
  "enrollment.grant": "Acesso concedido",
  "enrollment.revoke": "Acesso revogado",
  "user.role": "Papel alterado",
  "user.disabled": "Conta desativada",
  "user.enabled": "Conta reativada",
  "application.approved": "Candidatura aprovada",
  "application.rejected": "Candidatura recusada",
  "review.hidden": "Avaliação escondida",
  "review.shown": "Avaliação reposta",
  "settings.payments": "Definições de pagamento alteradas",
};

export default async function AuditPage() {
  const rows = await (await getDb())
    .select({ event: auditEvents, actor: users.name })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .orderBy(desc(auditEvents.id))
    .limit(300);
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Registo de auditoria">
        Ações importantes da equipa e do sistema. Este registo não pode ser editado nem apagado (garantido pela base de dados).
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon="shield" title="Sem eventos" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, actor }) => (
                <tr key={event.id}>
                  <td className="nowrap">{formatDateTime(event.createdAt)}</td>
                  <td>{actor ?? "Sistema"}</td>
                  <td>{actionLabel[event.action] ?? event.action}</td>
                  <td className="xsmall mono muted" style={{ maxWidth: 420, wordBreak: "break-word" }}>
                    {event.entityType}
                    {Object.keys(event.data).length ? ` · ${JSON.stringify(event.data)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
