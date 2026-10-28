import Link from "next/link";
import { CourseCover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { Kpi, PageHeader, RevenueChart } from "@/components/workspace";
import { CourseStatusBadge, Notice } from "@/components/ui";
import { formatRelative, providerLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { adminOverview, coursePerformance, dailySeries, recentSales } from "@/server/analytics/service";
import { getDb } from "@/server/db/client";
import type { CourseStatus, PaymentProviderId } from "@/server/db/schema";
import { isLocalMode } from "@/server/config";

export default async function AdminOverview() {
  const db = await getDb();
  const [o, series, perf, sales] = await Promise.all([adminOverview(db), dailySeries(db, 30), coursePerformance(db), recentSales(db, { limit: 8 })]);
  const series30 = series.reduce((s, d) => s + d.revenueCents, 0);
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Visão geral">
        Receita conta apenas pagamentos confirmados (sem simulador). Reembolsos não contam como receita.
      </PageHeader>

      {o.awaitingCount > 0 && (
        <Notice tone="warning" icon="wallet">
          <strong>{o.awaitingCount}</strong> {o.awaitingCount === 1 ? "pagamento aguarda" : "pagamentos aguardam"} verificação ({formatMoney(o.awaitingCents)}).{" "}
          <Link href="/admin/pagamentos" className="link">
            Abrir a fila
          </Link>
        </Notice>
      )}

      <div className="kpis">
        <Kpi tone="hero" icon="wallet" label="Receita confirmada" value={formatMoney(o.revenueCents)} sub={`${formatMoney(o.revenue30Cents)} nos últimos 30 dias · ${o.paidOrders} vendas`} />
        <Kpi
          tone={o.awaitingCount ? "alert" : undefined}
          icon="clock"
          label="Por verificar"
          value={o.awaitingCount}
          sub={o.awaitingCount ? formatMoney(o.awaitingCents) : `${o.pendingCount} pedidos à espera de pagamento`}
          href="/admin/pagamentos"
        />
        <Kpi icon="users" label="Estudantes" value={o.students} sub={`${o.newUsers30} contas novas em 30 dias`} href="/admin/utilizadores" />
        <Kpi icon="book" label="Inscrições ativas" value={o.activeEnrollments} sub={`${o.activeLearners30} aprenderam nos últimos 30 dias`} />
        <Kpi icon="award" label="Certificados" value={o.certificates} sub={o.activeEnrollments ? `${Math.round((o.certificates / o.activeEnrollments) * 100)}% das inscrições concluídas` : "—"} />
        <Kpi icon="layers" label="Cursos publicados" value={o.publishedCourses} sub={o.inReview ? `${o.inReview} em revisão` : `${o.instructors} instrutores`} href="/admin/cursos" />
      </div>

      <div className="two-col">
        <section className="card card-pad">
          <div className="panel-head">
            <h2>Receita confirmada por dia</h2>
            <span className="small muted">Últimos 30 dias · {formatMoney(series30)}</span>
          </div>
          <RevenueChart series={series} />
          {isLocalMode() && o.sandboxPaidCents > 0 && (
            <p className="xsmall muted" style={{ marginTop: 10 }}>
              {formatMoney(o.sandboxPaidCents)} em pagamentos do simulador excluídos destes números.
            </p>
          )}
        </section>
        <section className="card card-pad">
          <div className="panel-head">
            <h2>Últimas vendas</h2>
            <Link href="/admin/pagamentos?estado=paid" className="small link">
              Ver todas
            </Link>
          </div>
          {sales.length === 0 ? (
            <p className="muted small">Ainda sem vendas confirmadas.</p>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, ["--gap" as string]: "12px" }}>
              {sales.map((s) => (
                <li key={s.reference} className="spread" style={{ alignItems: "flex-start" }}>
                  <div className="stack" style={{ ["--gap" as string]: "2px", minWidth: 0, flex: 1 }}>
                    <strong className="small">{s.studentName}</strong>
                    <span className="xsmall muted">
                      {s.courseTitle} · {providerLabel[s.provider as PaymentProviderId]} · {formatRelative(s.paidAt)}
                    </span>
                  </div>
                  <span className="small tabular" style={{ fontWeight: 650 }}>
                    {formatMoney(s.amountCents, s.currency)}
                    {s.provider === "sandbox" && <span className="badge" style={{ marginLeft: 6 }}>teste</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="panel-head">
          <h2>Desempenho dos cursos</h2>
          <Link href="/admin/cursos" className="small link">
            Gerir cursos
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Estado</th>
                <th className="num">Estudantes</th>
                <th className="num">Progresso médio</th>
                <th className="num">Concluíram</th>
                <th className="num">Avaliação</th>
                <th className="num">Receita</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row" style={{ ["--gap" as string]: "12px", flexWrap: "nowrap" }}>
                      <div className="course-row-thumb">
                        <CourseCover seed={c.coverSeed} title={c.title} rounded={false} />
                      </div>
                      <div className="stack" style={{ ["--gap" as string]: "0" }}>
                        <Link href={`/instrutor/cursos/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                          {c.title}
                        </Link>
                        <span className="xsmall muted">{c.instructorName}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <CourseStatusBadge status={c.status as CourseStatus} />
                  </td>
                  <td className="num">{c.students}</td>
                  <td className="num">{c.students ? `${c.avgProgress}%` : "—"}</td>
                  <td className="num">{c.completions}</td>
                  <td className="num">{c.ratingAvg !== null ? `${c.ratingAvg.toLocaleString("pt-PT")} ★ (${c.ratingCount})` : "—"}</td>
                  <td className="num">{formatMoney(c.revenueCents, c.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="xsmall muted">
        <Icon name="info" size={13} style={{ display: "inline", verticalAlign: -2 }} /> Progresso médio: média da percentagem de aulas concluídas entre estudantes com
        inscrição ativa. Concluíram: certificados válidos.
      </p>
    </>
  );
}
