import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/workspace";
import { EmptyState, OrderStatusBadge } from "@/components/ui";
import { formatDateTime, orderStatusLabel, providerLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getDb } from "@/server/db/client";
import type { OrderStatus } from "@/server/db/schema";
import { expireStaleOrders, listOrdersForStaff } from "@/server/payments/orders";

export const metadata: Metadata = { title: "Pagamentos" };

const tabs: { key: string; label: string }[] = [
  { key: "awaiting_verification", label: "Por verificar" },
  { key: "open", label: "Abertos" },
  { key: "paid", label: "Pagos" },
  { key: "failed", label: "Recusados" },
  { key: "refunded", label: "Reembolsados" },
  { key: "todos", label: "Todos" },
];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const sp = await searchParams;
  const estado = sp.estado ?? "awaiting_verification";
  const db = await getDb();
  await expireStaleOrders(db);
  const status = estado === "todos" ? undefined : estado === "open" ? "open" : (Object.keys(orderStatusLabel).includes(estado) ? (estado as OrderStatus) : undefined);
  const rows = await listOrdersForStaff(db, { status, q: sp.q });

  return (
    <>
      <PageHeader eyebrow="Gestão" title="Pagamentos">
        Confirma cada pagamento no extrato da carteira M-Pesa/e-Mola (ID da transação, valor e número) antes de aprovar. Nunca com base numa captura de
        ecrã.
      </PageHeader>
      <div className="spread">
        <nav className="filter-tabs" aria-label="Filtrar por estado">
          {tabs.map((t) => (
            <Link key={t.key} href={`/admin/pagamentos?estado=${t.key}`} className={`chip${estado === t.key ? " is-active" : ""}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="header-search" style={{ display: "block", maxWidth: 340 }} role="search">
          <input type="hidden" name="estado" value={estado} />
          <input className="input" name="q" defaultValue={sp.q} placeholder="Referência, ID, email ou nome" aria-label="Pesquisar pagamentos" style={{ paddingLeft: 16 }} />
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="wallet" title={estado === "awaiting_verification" ? "Nenhum pagamento por verificar" : "Sem resultados"}>
          {estado === "awaiting_verification" ? "Quando um estudante indicar o ID da transação, aparece aqui e recebes um email." : undefined}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Estudante</th>
                <th>Curso</th>
                <th>Método · ID da transação</th>
                <th>Data</th>
                <th>Estado</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/pagamentos/${o.id}`} className="link mono">
                      {o.reference}
                    </Link>
                  </td>
                  <td>
                    <div className="stack" style={{ ["--gap" as string]: "0" }}>
                      <span style={{ fontWeight: 600 }}>{o.userName}</span>
                      <span className="xsmall muted">{o.userEmail}</span>
                    </div>
                  </td>
                  <td>{o.courseTitle}</td>
                  <td>
                    {providerLabel[o.provider]}
                    {o.providerReference && (
                      <>
                        {" · "}
                        <span className="mono">{o.providerReference}</span>
                      </>
                    )}
                    {o.payerPhoneMasked && <div className="xsmall muted">{o.payerPhoneMasked}</div>}
                  </td>
                  <td className="nowrap">{formatDateTime(o.submittedAt ?? o.createdAt)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="num">{formatMoney(o.amountCents, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
