import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOrderAction, simulateAction, submitPaymentAction } from "@/actions/commerce";
import { AutoRefresh } from "@/components/auto-refresh";
import { CourseCover } from "@/components/cover";
import { ActionForm, ConfirmSubmit, CopyButton, FieldError, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Notice, OrderStatusBadge } from "@/components/ui";
import { formatDateTime, providerLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { expireStaleOrders, getOrderForStudent } from "@/server/payments/orders";
import { providerOption } from "@/server/payments/providers";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Pedido" };

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await requireUserPage(`/pedidos/${reference}`);
  const db = await getDb();
  await expireStaleOrders(db);
  const order = await getOrderForStudent(db, reference.toUpperCase(), user.id);
  if (!order) notFound();
  const settings = await getSetting(db, "payments");
  const option = providerOption(settings, order.provider);
  const amount = formatMoney(order.amountCents, order.currency);
  const amountPlain = String(order.amountCents / 100);

  const stage = { pending: 1, awaiting_verification: 2, paid: 4, failed: 2, cancelled: 1, expired: 1, refunded: 4 }[order.status];
  const steps = ["Pedido criado", "Pagamento enviado", "Verificação", "Acesso aberto"];

  return (
    <div className="container-narrow section-tight stack" style={{ ["--gap" as string]: "26px" }}>
      {(order.status === "pending" || order.status === "awaiting_verification") && <AutoRefresh seconds={order.provider === "sandbox" ? 5 : 20} />}
      <div className="spread">
        <div className="stack" style={{ ["--gap" as string]: "6px" }}>
          <span className="small muted">
            Pedido <span className="mono">{order.reference}</span> · {formatDateTime(order.createdAt)}
          </span>
          <h1 className="h1">{order.courseTitle}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <ol className="order-steps" aria-label="Estado do pedido">
        {steps.map((s, i) => (
          <li key={s} className={`order-step ${i + 1 < stage || order.status === "paid" ? "done" : i + 1 === stage ? "current" : ""}`}>
            {s}
          </li>
        ))}
      </ol>

      {order.status === "paid" && (
        <div className="card status-hero">
          <span className="status-icon ok">
            <Icon name="checkCircle" size={38} />
          </span>
          <h2 className="h2">Pagamento confirmado!</h2>
          <p className="muted">O curso já está na tua área de aprendizagem. Bons estudos.</p>
          <Link href={`/aprender/${order.courseSlug}`} className="btn btn-lg btn-teal">
            Começar a aprender <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      )}

      {order.status === "awaiting_verification" && (
        <div className="card status-hero">
          <span className="status-icon wait">
            <Icon name="clock" size={36} />
          </span>
          <h2 className="h2">Estamos a verificar o pagamento</h2>
          <p className="muted" style={{ maxWidth: "52ch" }}>
            Recebemos o ID <span className="mono">{order.providerReference}</span> do número {order.payerPhoneMasked}. A equipa confirma no extrato da
            carteira — normalmente no mesmo dia útil. Esta página atualiza sozinha e enviamos-te um email.
          </p>
        </div>
      )}

      {(order.status === "failed" || order.status === "expired" || order.status === "cancelled") && (
        <div className="card status-hero">
          <span className={`status-icon ${order.status === "failed" ? "bad" : "pending"}`}>
            <Icon name={order.status === "failed" ? "alert" : "clock"} size={36} />
          </span>
          <h2 className="h2">
            {order.status === "failed" ? "Pagamento não confirmado" : order.status === "expired" ? "O pedido expirou" : "Pedido cancelado"}
          </h2>
          {order.failureReason && <p className="muted">Motivo: {order.failureReason}</p>}
          <p className="muted small" style={{ maxWidth: "50ch" }}>
            Se o dinheiro saiu da tua carteira, contacta o apoio com a referência <span className="mono">{order.reference}</span> e o SMS de
            confirmação.
          </p>
          <Link href={`/checkout/${order.courseSlug}`} className="btn">
            Tentar novamente
          </Link>
        </div>
      )}

      {order.status === "refunded" && <Notice tone="info">Este pedido foi reembolsado e o acesso associado foi encerrado.</Notice>}

      {order.status === "pending" && order.provider !== "sandbox" && option?.wallet && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
          <section className="pay-instructions">
            <span className="eyebrow" style={{ color: "var(--saffron)" }}>
              Passo 1 · Envia o pagamento
            </span>
            <div>
              <div className="kv">
                <span>Método</span>
                <strong>{providerLabel[order.provider]}</strong>
              </div>
              <div className="kv">
                <span>Número</span>
                <span className="row" style={{ ["--gap" as string]: "10px" }}>
                  <strong className="mono">{option.wallet.number}</strong>
                  <CopyButton value={option.wallet.number.replace(/\s/g, "")} />
                </span>
              </div>
              <div className="kv">
                <span>Titular</span>
                <strong style={{ fontSize: 15 }}>{option.wallet.accountName}</strong>
              </div>
              <div className="kv">
                <span>Valor exato</span>
                <span className="row" style={{ ["--gap" as string]: "10px" }}>
                  <strong>{amount}</strong>
                  <CopyButton value={amountPlain} />
                </span>
              </div>
              <div className="kv">
                <span>Referência</span>
                <span className="row" style={{ ["--gap" as string]: "10px" }}>
                  <strong className="mono">{order.reference}</strong>
                  <CopyButton value={order.reference} />
                </span>
              </div>
            </div>
            {settings.instructions && <p className="small" style={{ opacity: 0.8 }}>{settings.instructions}</p>}
            <p className="xsmall" style={{ opacity: 0.7 }}>
              Prazo: {formatDateTime(order.expiresAt)}. Nunca partilhes o teu PIN com ninguém, nem com a Kuvona.
            </p>
          </section>
          <section className="card card-pad">
            <ActionForm action={submitPaymentAction.bind(null, order.id)} className="stack">
              <span className="eyebrow">Passo 2 · Confirma aqui</span>
              <p className="small muted">Depois de pagares, recebes um SMS de confirmação. Copia o ID da transação para aqui.</p>
              <div className="field">
                <label className="label" htmlFor="transactionId">
                  ID da transação
                </label>
                <input
                  className="input mono"
                  id="transactionId"
                  name="transactionId"
                  placeholder="ex.: 9AB3CDEF12"
                  required
                  autoComplete="off"
                  style={{ textTransform: "uppercase" }}
                />
                <FieldError name="transactionId" />
              </div>
              <div className="field">
                <label className="label" htmlFor="phone">
                  Número que fez o pagamento
                </label>
                <div className="input-affix">
                  <span className="affix">+258</span>
                  <input className="input" id="phone" name="phone" inputMode="tel" placeholder="84 123 4567" required autoComplete="tel-national" />
                </div>
              </div>
              <SubmitButton className="btn btn-lg btn-block btn-accent" pendingLabel="A enviar…">
                Enviei o pagamento
              </SubmitButton>
            </ActionForm>
          </section>
        </div>
      )}

      {order.status === "pending" && order.provider === "sandbox" && (
        <section className="card card-pad stack" style={{ ["--gap" as string]: "20px" }}>
          <Notice tone="warning">
            Simulador de testes: imita o pedido de confirmação que chegaria ao telemóvel. Não movimenta dinheiro e só existe em modo local.
          </Notice>
          <div className="phone-sim">
            <Icon name="phone" size={28} style={{ margin: "0 auto" }} />
            <div className="ussd">
              Confirmar pagamento de <strong>{amount}</strong> a ACADEMIA KUVONA?
              <br />
              Ref: {order.reference}
            </div>
            <div className="row" style={{ justifyContent: "center", ["--gap" as string]: "10px" }}>
              <ActionForm action={simulateAction.bind(null, order.id, "failed")} showSuccess={false}>
                <SubmitButton className="btn btn-sm btn-danger" pendingLabel="…">
                  Recusar
                </SubmitButton>
              </ActionForm>
              <ActionForm action={simulateAction.bind(null, order.id, "success")} showSuccess={false}>
                <SubmitButton className="btn btn-sm btn-teal" pendingLabel="A confirmar…">
                  Confirmar
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        </section>
      )}

      <div className="card card-pad spread">
        <div className="row" style={{ ["--gap" as string]: "16px" }}>
          <div style={{ width: 96, borderRadius: 12, overflow: "hidden", aspectRatio: "16/10" }}>
            <CourseCover seed={order.courseCoverSeed} title={order.courseTitle} rounded={false} />
          </div>
          <div className="stack" style={{ ["--gap" as string]: "2px" }}>
            <strong>{order.courseTitle}</strong>
            <span className="small muted">
              {providerLabel[order.provider]} · {amount}
            </span>
          </div>
        </div>
        {order.status === "pending" && (
          <ActionForm action={cancelOrderAction.bind(null, order.id)}>
            <ConfirmSubmit label="Cancelar pedido" title="Cancelar este pedido?" description="Se já enviaste dinheiro, não canceles: indica o ID da transação." confirmLabel="Sim, cancelar" />
          </ActionForm>
        )}
      </div>

      <p className="small muted" style={{ textAlign: "center" }}>
        <Link href="/pedidos" className="link">
          Ver todos os meus pedidos
        </Link>
      </p>
    </div>
  );
}
