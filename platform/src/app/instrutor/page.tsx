import Link from "next/link";
import { CourseCover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { Kpi, PageHeader, RevenueChart } from "@/components/workspace";
import { CourseStatusBadge, EmptyState } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireRolePage } from "@/server/auth/session";
import { coursePerformance, dailySeries, instructorTotals, recentSales } from "@/server/analytics/service";
import { getDb } from "@/server/db/client";
import type { CourseStatus } from "@/server/db/schema";

export default async function InstructorDashboard() {
  const user = await requireRolePage(["instructor", "admin"], "/instrutor");
  const db = await getDb();
  const [totals, series, perf, sales] = await Promise.all([
    instructorTotals(db, user.id),
    dailySeries(db, 30, user.id),
    coursePerformance(db, user.id),
    recentSales(db, { instructorId: user.id, limit: 6 }),
  ]);
  const first = user.name.split(" ")[0];
  return (
    <>
      <PageHeader
        eyebrow="Área do instrutor"
        title={`Olá, ${first}`}
        actions={
          <Link href="/instrutor/cursos?novo=1" className="btn btn-accent">
            <Icon name="plus" size={18} /> Novo curso
          </Link>
        }
      >
        Os números referem-se apenas aos teus cursos. Receita = pagamentos confirmados pela gestão.
      </PageHeader>

      <div className="kpis">
        <Kpi tone="hero" icon="users" label="Estudantes" value={totals.students} sub={`em ${totals.published} ${totals.published === 1 ? "curso publicado" : "cursos publicados"}`} />
        <Kpi icon="wallet" label="Vendas confirmadas" value={formatMoney(totals.revenueCents)} sub={`${formatMoney(totals.revenue30Cents)} nos últimos 30 dias`} />
        <Kpi icon="award" label="Certificados emitidos" value={totals.certificates} />
        <Kpi icon="star" label="Avaliação média" value={totals.ratingAvg !== null ? totals.ratingAvg.toLocaleString("pt-PT") : "—"} />
        <Kpi
          tone={totals.openQuestions ? "alert" : undefined}
          icon="message"
          label="Perguntas por responder"
          value={totals.openQuestions}
          href="/instrutor/perguntas"
        />
      </div>

      <div className="two-col">
        <section className="card card-pad">
          <div className="panel-head">
            <h2>Vendas dos teus cursos por dia</h2>
            <span className="small muted">Últimos 30 dias</span>
          </div>
          <RevenueChart series={series} title="Vendas confirmadas por dia" />
        </section>
        <section className="card card-pad">
          <div className="panel-head">
            <h2>Últimas vendas</h2>
          </div>
          {sales.length === 0 ? (
            <p className="small muted">Ainda sem vendas confirmadas.</p>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, ["--gap" as string]: "12px" }}>
              {sales.map((s) => (
                <li key={s.reference} className="spread">
                  <span className="stack" style={{ ["--gap" as string]: "2px" }}>
                    <strong className="small">{s.courseTitle}</strong>
                    <span className="xsmall muted">
                      {s.studentName} · {formatRelative(s.paidAt)}
                    </span>
                  </span>
                  <span className="small tabular" style={{ fontWeight: 650 }}>
                    {formatMoney(s.amountCents, s.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="panel-head">
          <h2>Os teus cursos</h2>
          <Link href="/instrutor/cursos" className="small link">
            Gerir
          </Link>
        </div>
        {perf.length === 0 ? (
          <EmptyState icon="book" title="Ainda não tens cursos" action={{ href: "/instrutor/cursos?novo=1", label: "Criar o primeiro curso" }}>
            Cria um curso, organiza módulos e aulas com links do YouTube e envia para revisão.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th className="num">Estudantes</th>
                  <th className="num">Progresso médio</th>
                  <th className="num">Concluíram</th>
                  <th className="num">Perguntas</th>
                  <th className="num">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {perf.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/instrutor/cursos/${c.id}`} className="row" style={{ ["--gap" as string]: "12px", textDecoration: "none", flexWrap: "nowrap" }}>
                        <span className="course-row-thumb">
                          <CourseCover seed={c.coverSeed} title={c.title} rounded={false} />
                        </span>
                        <strong>{c.title}</strong>
                      </Link>
                    </td>
                    <td>
                      <CourseStatusBadge status={c.status as CourseStatus} />
                    </td>
                    <td className="num">
                      <Link href={`/instrutor/cursos/${c.id}/estudantes`} className="link-quiet">
                        {c.students}
                      </Link>
                    </td>
                    <td className="num">{c.students ? `${c.avgProgress}%` : "—"}</td>
                    <td className="num">{c.completions}</td>
                    <td className="num">{c.openQuestions ? <span className="badge badge-warning">{c.openQuestions}</span> : 0}</td>
                    <td className="num">{formatMoney(c.revenueCents, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
