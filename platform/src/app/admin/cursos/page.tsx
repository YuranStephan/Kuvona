import type { Metadata } from "next";
import Link from "next/link";
import { publishCourseAction, requestChangesAction, setCourseStatusAction, toggleFeaturedAction } from "@/actions/admin";
import { createCourseAction } from "@/actions/studio";
import { CourseCover } from "@/components/cover";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/workspace";
import { CourseStatusBadge, EmptyState } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requireRolePage } from "@/server/auth/session";
import { listEditableCourses } from "@/server/catalog/editor";
import { getDb } from "@/server/db/client";
import { courses, users } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

export const metadata: Metadata = { title: "Cursos" };

const tabs = [
  { key: "in_review", label: "Em revisão" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Rascunhos" },
  { key: "archived", label: "Arquivados" },
  { key: "todos", label: "Todos" },
];

export default async function AdminCourses({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const actor = await requireRolePage(["admin"], "/admin/cursos");
  const estado = (await searchParams).estado ?? "in_review";
  const db = await getDb();
  const all = await listEditableCourses(db, actor);
  const rows = estado === "todos" ? all : all.filter((c) => c.status === estado);
  const featured = new Set(
    (await db.select({ id: courses.id }).from(courses).where(eq(courses.featured, true))).map((r) => r.id),
  );
  const instructors = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.role, ["instructor", "admin"]));

  return (
    <>
      <PageHeader eyebrow="Gestão" title="Cursos">
        Instrutores enviam cursos para revisão; a gestão publica ou pede alterações. Retirar da loja não tira o acesso a quem já está inscrito.
      </PageHeader>

      <details className="card card-pad">
        <summary style={{ cursor: "pointer", fontWeight: 650 }}>
          <Icon name="plus" size={16} style={{ display: "inline", verticalAlign: -3 }} /> Criar curso para um instrutor
        </summary>
        <ActionForm action={createCourseAction} className="form-grid" >
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="new-title">
              Título provisório
            </label>
            <input className="input" id="new-title" name="title" required minLength={4} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="new-instructor">
              Instrutor
            </label>
            <select className="select" id="new-instructor" name="instructorId">
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <SubmitButton pendingLabel="A criar…">Criar rascunho</SubmitButton>
          </div>
        </ActionForm>
      </details>

      <nav className="filter-tabs" aria-label="Filtrar cursos">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/cursos?estado=${t.key}`} className={`chip${estado === t.key ? " is-active" : ""}`}>
            {t.label} <span className="muted">{t.key === "todos" ? all.length : all.filter((c) => c.status === t.key).length}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon="book" title={estado === "in_review" ? "Nenhum curso à espera de revisão" : "Sem cursos neste estado"} />
      ) : (
        <div className="stack" style={{ ["--gap" as string]: "12px" }}>
          {rows.map((c) => (
            <article key={c.id} className="card card-pad">
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div className="row" style={{ ["--gap" as string]: "16px", flexWrap: "nowrap", minWidth: 0 }}>
                  <div className="course-row-thumb" style={{ width: 96 }}>
                    <CourseCover seed={c.coverSeed} title={c.title} rounded={false} />
                  </div>
                  <div className="stack" style={{ ["--gap" as string]: "4px", minWidth: 0 }}>
                    <div className="row" style={{ ["--gap" as string]: "8px" }}>
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: 19 }}>{c.title}</strong>
                      <CourseStatusBadge status={c.status} />
                      {featured.has(c.id) && <span className="badge badge-ink">Destaque</span>}
                    </div>
                    <span className="small muted">
                      {c.instructorName} · {c.lessonCount} aulas · {c.studentCount} estudantes · {formatPrice(c.priceCents, c.currency)} · atualizado {formatRelative(c.updatedAt)}
                    </span>
                    {c.reviewNote && c.status === "draft" && <span className="small" style={{ color: "var(--warning)" }}>Alterações pedidas: {c.reviewNote}</span>}
                  </div>
                </div>
                <div className="row" style={{ ["--gap" as string]: "8px" }}>
                  <Link href={`/cursos/${c.slug}`} className="btn btn-ghost btn-sm" target="_blank">
                    <Icon name="eye" size={16} /> Ver
                  </Link>
                  <Link href={`/instrutor/cursos/${c.id}`} className="btn btn-soft btn-sm">
                    <Icon name="edit" size={16} /> Editar
                  </Link>
                  {c.status !== "published" && c.status !== "archived" && (
                    <ActionForm action={publishCourseAction.bind(null, c.id)}>
                      <SubmitButton className="btn btn-teal btn-sm" pendingLabel="…">
                        <Icon name="check" size={16} /> Publicar
                      </SubmitButton>
                    </ActionForm>
                  )}
                  {c.status === "published" && (
                    <>
                      <form action={toggleFeaturedAction.bind(null, c.id, !featured.has(c.id))}>
                        <button className="btn btn-ghost btn-sm" type="submit">
                          <Icon name="star" size={16} /> {featured.has(c.id) ? "Tirar destaque" : "Destacar"}
                        </button>
                      </form>
                      <ActionForm action={setCourseStatusAction.bind(null, c.id, "draft")}>
                        <ConfirmSubmit label="Retirar da loja" title="Retirar este curso da loja?" description="Deixa de aparecer no catálogo e não pode ser comprado. Os estudantes inscritos mantêm o acesso." confirmLabel="Retirar" />
                      </ActionForm>
                    </>
                  )}
                </div>
              </div>
              {c.status === "in_review" && (
                <ActionForm action={requestChangesAction.bind(null, c.id)} className="row" >
                  <input className="input" name="note" placeholder="Pedir alterações: o que o instrutor deve melhorar?" style={{ flex: 1, minWidth: 240, marginTop: 14 }} />
                  <SubmitButton className="btn btn-outline btn-sm" pendingLabel="…">
                    Pedir alterações
                  </SubmitButton>
                </ActionForm>
              )}
              {c.status === "draft" && c.studentCount === 0 && (
                <div style={{ marginTop: 10 }}>
                  <ActionForm action={setCourseStatusAction.bind(null, c.id, "archived")}>
                    <ConfirmSubmit label="Arquivar" title="Arquivar este curso?" className="btn btn-ghost btn-xs" description="Fica guardado mas escondido de todas as listas públicas." confirmLabel="Arquivar" />
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
