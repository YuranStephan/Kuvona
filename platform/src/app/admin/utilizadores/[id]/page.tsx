import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { changeRoleAction, grantCourseAction, revokeCourseAction, setUserDisabledAction } from "@/actions/admin";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/workspace";
import { Avatar, OrderStatusBadge } from "@/components/ui";
import { formatDate, formatDateTime, roleLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireRolePage } from "@/server/auth/session";
import { getUserDetail } from "@/server/admin/users";
import { getDb } from "@/server/db/client";
import { courses } from "@/server/db/schema";
import { asc } from "drizzle-orm";

export const metadata: Metadata = { title: "Utilizador" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireRolePage(["admin"], `/admin/utilizadores/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const detail = await getUserDetail(db, id);
  if (!detail) notFound();
  const { user, access, orders } = detail;
  const allCourses = await db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.title));
  const self = actor.id === user.id;

  return (
    <>
      <Link href="/admin/utilizadores" className="row small link-quiet" style={{ ["--gap" as string]: "6px" }}>
        <Icon name="arrowLeft" size={16} /> Utilizadores
      </Link>
      <div className="row" style={{ ["--gap" as string]: "18px" }}>
        <Avatar name={user.name} size={64} />
        <PageHeader eyebrow={roleLabel[user.role]} title={user.name}>
          {user.email} · registo em {formatDate(user.createdAt)} · {user.emailVerifiedAt ? "email confirmado" : "email por confirmar"}
          {user.disabledAt ? " · conta desativada" : ""}
        </PageHeader>
      </div>

      <div className="two-col">
        <div className="stack" style={{ ["--gap" as string]: "22px" }}>
          <section className="form-section">
            <h2>Acesso a cursos</h2>
            {access.length === 0 ? (
              <p className="muted small">Sem inscrições.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {access.map((a) => (
                      <tr key={a.courseId}>
                        <td>
                          <Link href={`/cursos/${a.slug}`} className="link-quiet" style={{ fontWeight: 600 }}>
                            {a.title}
                          </Link>
                          <div className="xsmall muted">
                            {a.source === "purchase" ? "Compra" : a.source === "grant" ? "Concedido pela gestão" : "Gratuito"} · {formatDate(a.grantedAt)}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${a.status === "active" ? "badge-success" : "badge-danger"}`}>{a.status === "active" ? "Ativo" : "Revogado"}</span>
                        </td>
                        <td className="num">
                          {a.status === "active" && a.source !== "purchase" && (
                            <ActionForm action={revokeCourseAction.bind(null, user.id, a.courseId)}>
                              <ConfirmSubmit label="Revogar" className="btn btn-ghost btn-xs" title="Revogar o acesso?" confirmLabel="Revogar">
                                <input className="input" name="reason" placeholder="Motivo (fica no registo de auditoria)" required minLength={5} />
                              </ConfirmSubmit>
                            </ActionForm>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ActionForm action={grantCourseAction.bind(null, user.id)} className="form-grid">
              <div className="field">
                <label className="label" htmlFor="grant-course">
                  Conceder acesso a um curso
                </label>
                <select className="select" id="grant-course" name="courseId">
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="grant-reason">
                  Motivo
                </label>
                <input className="input" id="grant-reason" name="reason" placeholder="ex.: bolsa, parceria, pagamento fora da plataforma" required minLength={5} />
              </div>
              <div style={{ alignSelf: "end" }}>
                <SubmitButton className="btn btn-teal" pendingLabel="…">
                  Conceder acesso
                </SubmitButton>
              </div>
            </ActionForm>
          </section>

          <section className="form-section">
            <h2>Pedidos</h2>
            {orders.length === 0 ? (
              <p className="muted small">Sem pedidos.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/pagamentos/${o.id}`} className="link mono">
                            {o.reference}
                          </Link>
                        </td>
                        <td>{o.courseTitle}</td>
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
          </section>
        </div>

        <aside className="stack" style={{ ["--gap" as string]: "22px" }}>
          <section className="form-section">
            <h2>Papel</h2>
            <ActionForm action={changeRoleAction.bind(null, user.id)} className="stack">
              <select className="select" name="role" defaultValue={user.role} aria-label="Papel" disabled={self}>
                <option value="student">Estudante</option>
                <option value="instructor">Instrutor</option>
                <option value="admin">Gestão</option>
              </select>
              <p className="xsmall muted">Instrutores criam e gerem os seus cursos. A gestão tem acesso total, incluindo pagamentos.</p>
              {!self && (
                <div>
                  <SubmitButton className="btn btn-sm" pendingLabel="…">
                    Guardar papel
                  </SubmitButton>
                </div>
              )}
            </ActionForm>
          </section>
          {!self && (
            <section className="form-section">
              <h2>Conta</h2>
              <ActionForm action={setUserDisabledAction.bind(null, user.id, !user.disabledAt)}>
                {user.disabledAt ? (
                  <SubmitButton className="btn btn-teal btn-sm" pendingLabel="…">
                    Reativar conta
                  </SubmitButton>
                ) : (
                  <ConfirmSubmit label="Desativar conta" title="Desativar esta conta?" description="A pessoa deixa de conseguir entrar e todas as sessões são terminadas. Os dados ficam guardados." confirmLabel="Desativar" />
                )}
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
