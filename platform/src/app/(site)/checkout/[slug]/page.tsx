import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createOrderAction } from "@/actions/commerce";
import { CourseCover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Notice, Price } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { plural } from "@/lib/text";
import { requireUserPage } from "@/server/auth/session";
import { getCourseDetail } from "@/server/catalog/queries";
import { getDb } from "@/server/db/client";
import { availableProviders } from "@/server/payments/providers";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage(`/checkout/${slug}`);
  const db = await getDb();
  const detail = await getCourseDetail(db, slug, user);
  if (!detail || detail.course.status !== "published") notFound();
  const { course, stats, instructor, viewer } = detail;
  if (viewer.access === "enrolled") redirect(`/aprender/${course.slug}`);
  if (viewer.openOrderReference) redirect(`/pedidos/${viewer.openOrderReference}`);
  if (course.priceCents === 0) redirect(`/cursos/${course.slug}`);
  const providers = availableProviders(await getSetting(db, "payments"));

  return (
    <div className="container section-tight">
      <Link href={`/cursos/${course.slug}`} className="row small link-quiet" style={{ ["--gap" as string]: "6px", marginBottom: 20 }}>
        <Icon name="arrowLeft" size={16} /> Voltar ao curso
      </Link>
      <h1 className="h1" style={{ marginBottom: 28 }}>
        Finalizar compra
      </h1>
      <div className="checkout-grid">
        <ActionForm action={createOrderAction.bind(null, course.id)} className="stack" showSuccess={false}>
          <section className="card card-pad stack">
            <div className="stack" style={{ ["--gap" as string]: "4px" }}>
              <h2 className="h3">Como queres pagar?</h2>
              <p className="small muted">Pagas a partir do teu telemóvel. Nunca te pedimos o PIN.</p>
            </div>
            {providers.length === 0 ? (
              <Notice tone="warning">Os pagamentos ainda não estão configurados. Volta mais tarde ou contacta o apoio.</Notice>
            ) : (
              <div className="method-list" role="radiogroup" aria-label="Método de pagamento">
                {providers.map((p, i) => (
                  <label key={p.id} className="method">
                    <input type="radio" name="provider" value={p.id} defaultChecked={i === 0} required />
                    <div className="stack" style={{ ["--gap" as string]: "3px" }}>
                      <strong>{p.label}</strong>
                      <span className="small muted">{p.description}</span>
                    </div>
                    <span className={`method-logo ${p.id === "manual_mpesa" ? "mpesa" : p.id === "manual_emola" ? "emola" : "sandbox"}`}>
                      {p.id === "manual_mpesa" ? "M-PESA" : p.id === "manual_emola" ? "e-Mola" : "TESTE"}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="card card-pad stack">
            <h2 className="h3">O que acontece a seguir</h2>
            <ol className="stack small" style={{ ["--gap" as string]: "10px", paddingLeft: 18, margin: 0 }}>
              <li>Criamos um pedido com uma referência única e o valor exato do curso.</li>
              <li>Envias o valor para o número da Academia e indicas o ID da transação que recebes por SMS.</li>
              <li>A equipa confirma no extrato e o acesso abre de imediato. Recebes um email.</li>
            </ol>
            <label className="check">
              <input type="checkbox" name="terms" required />
              <span className="small">
                Li e aceito os{" "}
                <Link href="/termos" className="link" target="_blank">
                  termos
                </Link>{" "}
                e a{" "}
                <Link href="/reembolsos" className="link" target="_blank">
                  política de reembolso
                </Link>
                .
              </span>
            </label>
            <SubmitButton className="btn btn-lg btn-block btn-accent" pendingLabel="A criar pedido…">
              Continuar para o pagamento <Icon name="arrowRight" size={18} />
            </SubmitButton>
          </section>
        </ActionForm>

        <aside className="card summary-card" style={{ overflow: "hidden" }}>
          <div style={{ aspectRatio: "16 / 8", overflow: "hidden" }}>
            <CourseCover seed={course.coverSeed} title={course.title} rounded={false} />
          </div>
          <div className="card-pad stack" style={{ ["--gap" as string]: "6px" }}>
            <span className="small muted">Resumo do pedido</span>
            <h2 className="h3">{course.title}</h2>
            <span className="small muted">
              {instructor.name} · {plural(stats.lessonCount, "aula", "aulas")}
              {stats.durationSeconds > 0 && ` · ${formatDuration(stats.durationSeconds)}`}
            </span>
            <div style={{ marginTop: 14 }}>
              <div className="summary-line">
                <span>Preço do curso</span>
                <Price cents={course.priceCents} currency={course.currency} className="small" />
              </div>
              <div className="summary-line summary-total">
                <span>Total a pagar</span>
                <Price cents={course.priceCents} currency={course.currency} />
              </div>
            </div>
            <p className="xsmall muted" style={{ marginTop: 6 }}>
              O preço é confirmado no servidor no momento do pedido. Comprado como {user.name} ({user.email}).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
