import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { confirmOrderAction, refundOrderAction, rejectOrderAction } from "@/actions/admin";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/workspace";
import { Notice, OrderStatusBadge } from "@/components/ui";
import { formatDateTime, orderStatusLabel, providerLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getDb } from "@/server/db/client";
import { getOrderDetailForStaff } from "@/server/payments/orders";

export const metadata: Metadata = { title: "Pedido" };

const eventLabel: Record<string, string> = {
  created: "Pedido criado",
  awaiting_verification: "Estudante indicou o pagamento",
  paid: "Pagamento confirmado — acesso concedido",
  failed: "Pagamento recusado",
  cancelled: "Pedido cancelado",
  expired: "Pedido expirou",
  refunded: "Reembolso registado — acesso encerrado",
  amount_mismatch: "Montante recebido não corresponde",
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getOrderDetailForStaff(await getDb(), id);
  if (!detail) notFound();
  const { order, events, enrollment } = detail;
  const manual = order.provider !== "sandbox";
  const canDecide = manual && (order.status === "awaiting_verification" || order.status === "pending");

  return (
    <>
      <Link href="/admin/pagamentos" className="row small link-quiet" style={{ ["--gap" as string]: "6px" }}>
        <Icon name="arrowLeft" size={16} /> Pagamentos
      </Link>
      <PageHeader eyebrow={`Pedido ${order.reference}`} title={formatMoney(order.amountCents, order.currency)} actions={<OrderStatusBadge status={order.status} />}>
        {order.courseTitle} · {order.userName}
      </PageHeader>

      <div className="two-col">
        <div className="stack" style={{ ["--gap" as string]: "22px" }}>
          {canDecide && (
            <section className="form-section" style={{ borderColor: "var(--ink)", borderWidth: 1.5 }}>
              <h2>Verificar pagamento</h2>
              <ol className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                <li>
                  Abre o extrato da carteira {providerLabel[order.provider]} da academia.
                </li>
                <li>
                  Procura a transação <strong className="mono">{order.providerReference ?? "(o estudante ainda não indicou)"}</strong> de{" "}
                  <strong>{formatMoney(order.amountCents, order.currency)}</strong>
                  {order.payerPhoneMasked && (
                    <>
                      {" "}
                      vinda de <strong>{order.payerPhoneMasked}</strong>
                    </>
                  )}
                  .
                </li>
                <li>Confirma só se valor e ID coincidirem. Cada ID só pode ser usado uma vez.</li>
              </ol>
              <ActionForm action={confirmOrderAction.bind(null, order.id)} className="stack">
                <div className="field">
                  <label className="label" htmlFor="providerReference">
                    ID da transação no extrato
                  </label>
                  <input
                    className="input mono"
                    id="providerReference"
                    name="providerReference"
                    defaultValue={order.providerReference ?? ""}
                    required={!order.providerReference}
                    placeholder="ex.: 9AB3CDEF12"
                  />
                </div>
                <label className="check">
                  <input type="checkbox" name="checked" required />
                  <span className="small">Confirmei no extrato: ID, valor e data coincidem.</span>
                </label>
                <div className="form-actions">
                  <SubmitButton className="btn btn-teal" pendingLabel="A confirmar…">
                    <Icon name="check" size={18} /> Confirmar pagamento
                  </SubmitButton>
                </div>
              </ActionForm>
              <hr className="divider" />
              <ActionForm action={rejectOrderAction.bind(null, order.id)} className="stack">
                <div className="field">
                  <label className="label" htmlFor="reason">
                    Recusar — motivo (o estudante recebe por email)
                  </label>
                  <input className="input" id="reason" name="reason" placeholder="ex.: transação não encontrada no extrato de 27/10" />
                </div>
                <div>
                  <ConfirmSubmit label="Recusar pagamento" title="Recusar este pagamento?" description="O pedido fica recusado e o estudante é notificado. Esta decisão não pode ser desfeita; o estudante pode criar um novo pedido." confirmLabel="Recusar" />
                </div>
              </ActionForm>
            </section>
          )}

          {order.status === "paid" && manual && (
            <section className="form-section">
              <h2>Reembolso</h2>
              <p className="small muted">
                Faz primeiro a devolução pela carteira. Depois regista-a aqui: o acesso desta compra termina (o progresso do estudante fica guardado) e o
                certificado é revogado.
              </p>
              <ActionForm action={refundOrderAction.bind(null, order.id)} className="stack">
                <div className="field">
                  <label className="label" htmlFor="refund-reason">
                    Motivo e forma de devolução
                  </label>
                  <input className="input" id="refund-reason" name="reason" placeholder="ex.: devolvido por M-Pesa a 28/10, ID 9XY…" />
                </div>
                <div>
                  <ConfirmSubmit label="Registar reembolso" title="Registar o reembolso?" description="O acesso ao curso associado a esta compra será encerrado." confirmLabel="Registar reembolso" />
                </div>
              </ActionForm>
            </section>
          )}

          {order.provider === "sandbox" && <Notice tone="info">Pedido do simulador: decidido pelo simulador de pagamentos (só em modo local). Não conta como receita.</Notice>}

          <section className="card card-pad">
            <div className="panel-head">
              <h2>Registo do pedido</h2>
              <span className="xsmall muted">Imutável — não pode ser editado nem apagado</span>
            </div>
            <ol className="ledger">
              {events.map((e) => (
                <li key={e.id}>
                  <span className={`pip ${e.toStatus ?? ""}`} />
                  <div className="stack" style={{ ["--gap" as string]: "2px" }}>
                    <strong className="small">{eventLabel[e.type] ?? e.type}</strong>
                    <span className="xsmall muted">
                      {formatDateTime(e.createdAt)} · {e.actorName ?? (e.type === "expired" ? "sistema" : "fornecedor")}
                    </span>
                    {Object.keys(e.data).length > 0 && (
                      <span className="xsmall mono muted" style={{ wordBreak: "break-all" }}>
                        {Object.entries(e.data)
                          .filter(([k]) => k !== "received")
                          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="card card-pad stack">
          <h2 className="h3">Detalhes</h2>
          <dl className="dl">
            <dt>Estado</dt>
            <dd>{orderStatusLabel[order.status]}</dd>
            <dt>Método</dt>
            <dd>{providerLabel[order.provider]}</dd>
            <dt>ID transação</dt>
            <dd className="mono">{order.providerReference ?? "—"}</dd>
            <dt>Telemóvel</dt>
            <dd>{order.payerPhoneMasked ?? "—"}</dd>
            <dt>Criado</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
            {order.submittedAt && (
              <>
                <dt>Indicado</dt>
                <dd>{formatDateTime(order.submittedAt)}</dd>
              </>
            )}
            {order.paidAt && (
              <>
                <dt>Pago</dt>
                <dd>{formatDateTime(order.paidAt)}</dd>
              </>
            )}
            {order.status === "pending" && (
              <>
                <dt>Expira</dt>
                <dd>{formatDateTime(order.expiresAt)}</dd>
              </>
            )}
            {order.failureReason && (
              <>
                <dt>Motivo</dt>
                <dd>{order.failureReason}</dd>
              </>
            )}
          </dl>
          <hr className="divider" />
          <h3 className="small" style={{ fontWeight: 700 }}>
            Estudante
          </h3>
          <Link href={`/admin/utilizadores/${order.userId}`} className="link">
            {order.userName}
          </Link>
          <span className="small muted">{order.userEmail}</span>
          <h3 className="small" style={{ fontWeight: 700, marginTop: 8 }}>
            Acesso ao curso
          </h3>
          <span className="small">
            {enrollment ? (enrollment.status === "active" ? `Ativo (${enrollment.source === "purchase" ? "compra" : enrollment.source === "grant" ? "concedido" : "gratuito"})` : "Revogado") : "Sem acesso"}
          </span>
        </aside>
      </div>
    </>
  );
}
