import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, OrderStatusBadge } from "@/components/ui";
import { formatDateTime, providerLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { expireStaleOrders, listOrdersForStudent } from "@/server/payments/orders";

export const metadata: Metadata = { title: "Pedidos e pagamentos" };

export default async function OrdersPage() {
  const user = await requireUserPage("/pedidos");
  const db = await getDb();
  await expireStaleOrders(db);
  const orders = await listOrdersForStudent(db, user.id);
  return (
    <div className="container section-tight stack" style={{ ["--gap" as string]: "24px" }}>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <span className="eyebrow">A minha conta</span>
        <h1 className="h1">Pedidos e pagamentos</h1>
      </div>
      {orders.length === 0 ? (
        <EmptyState icon="receipt" title="Ainda não fizeste nenhum pedido" action={{ href: "/cursos", label: "Explorar cursos" }} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Curso</th>
                <th>Método</th>
                <th>Data</th>
                <th>Estado</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/pedidos/${o.reference}`} className="link mono">
                      {o.reference}
                    </Link>
                  </td>
                  <td>{o.courseTitle}</td>
                  <td>{providerLabel[o.provider]}</td>
                  <td className="nowrap">{formatDateTime(o.createdAt)}</td>
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
      <p className="small muted">Os recibos com NUIT serão emitidos quando a faturação estiver configurada. Para dúvidas, contacta o apoio com a referência do pedido.</p>
    </div>
  );
}
