import type { Metadata } from "next";
import Link from "next/link";
import { createCourseAction } from "@/actions/studio";
import { CourseCover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/workspace";
import { CourseStatusBadge, EmptyState } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requireRolePage } from "@/server/auth/session";
import { listEditableCourses } from "@/server/catalog/editor";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = { title: "Os meus cursos" };

export default async function MyCourses({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const user = await requireRolePage(["instructor", "admin"], "/instrutor/cursos");
  const sp = await searchParams;
  const rows = await listEditableCourses(await getDb(), user);
  return (
    <>
      <PageHeader eyebrow="Área do instrutor" title={user.role === "admin" ? "Todos os cursos" : "Os meus cursos"} />
      <details className="card card-pad" open={Boolean(sp.novo) || rows.length === 0}>
        <summary style={{ cursor: "pointer", fontWeight: 650 }}>
          <Icon name="plus" size={16} style={{ display: "inline", verticalAlign: -3 }} /> Criar um curso novo
        </summary>
        <ActionForm action={createCourseAction} className="row" >
          <input className="input" name="title" required minLength={4} maxLength={120} placeholder="Título do curso, ex.: Excel para pequenos negócios" style={{ flex: 1, minWidth: 260, marginTop: 14 }} aria-label="Título do curso" />
          <SubmitButton className="btn btn-accent" pendingLabel="A criar…">
            Criar e editar
          </SubmitButton>
        </ActionForm>
        <p className="xsmall muted" style={{ marginTop: 10 }}>
          O curso começa como rascunho. Quando estiver pronto, envia para revisão: a gestão publica-o na loja.
        </p>
      </details>
      {rows.length === 0 ? (
        <EmptyState icon="book" title="Ainda não tens cursos" />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", ["--gap" as string]: "16px" }}>
          {rows.map((c) => (
            <Link key={c.id} href={`/instrutor/cursos/${c.id}`} className="course-card">
              <div className="course-card-cover">
                <CourseCover seed={c.coverSeed} title={c.title} rounded={false} />
                <span style={{ position: "absolute", top: 12, left: 12 }}>
                  <CourseStatusBadge status={c.status} />
                </span>
              </div>
              <div className="course-card-body">
                <h3>{c.title}</h3>
                {user.role === "admin" && <span className="by">{c.instructorName}</span>}
                <div className="course-card-stats">
                  <span>
                    <Icon name="layers" size={14} /> {c.lessonCount} aulas
                  </span>
                  <span>
                    <Icon name="users" size={14} /> {c.studentCount} estudantes
                  </span>
                </div>
                {c.reviewNote && c.status === "draft" && <span className="small" style={{ color: "var(--warning)" }}>Alterações pedidas pela gestão</span>}
                <div className="course-card-foot">
                  <span className="price" style={{ fontSize: 18 }}>
                    {formatPrice(c.priceCents, c.currency)}
                  </span>
                  <span className="xsmall muted">editado {formatRelative(c.updatedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
