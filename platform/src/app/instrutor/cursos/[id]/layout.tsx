import Link from "next/link";
import { Icon } from "@/components/icon";
import { TabsNav } from "@/components/tabs-nav";
import { CourseStatusBadge, Notice } from "@/components/ui";
import { loadEditor } from "./editor";

export default async function CourseEditorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, problems } = await loadEditor(id);
  const base = `/instrutor/cursos/${id}`;
  return (
    <div className="editor-head stack" style={{ ["--gap" as string]: "18px" }}>
      <Link href="/instrutor/cursos" className="row small link-quiet" style={{ ["--gap" as string]: "6px" }}>
        <Icon name="arrowLeft" size={16} /> Os meus cursos
      </Link>
      <div className="spread">
        <div className="stack" style={{ ["--gap" as string]: "8px" }}>
          <div className="row" style={{ ["--gap" as string]: "10px" }}>
            <CourseStatusBadge status={course.status} />
            {problems.length > 0 && course.status === "draft" && <span className="badge badge-warning">{problems.length} pendentes para publicar</span>}
          </div>
          <h1 className="h1">{course.title}</h1>
        </div>
        <div className="row">
          <Link href={`/cursos/${course.slug}`} className="btn btn-soft btn-sm" target="_blank">
            <Icon name="eye" size={16} /> Ver página
          </Link>
          <Link href={`/aprender/${course.slug}`} className="btn btn-soft btn-sm" target="_blank">
            <Icon name="play" size={16} /> Sala de aula
          </Link>
        </div>
      </div>
      {course.reviewNote && course.status === "draft" && (
        <Notice tone="warning">
          <strong>A gestão pediu alterações:</strong> {course.reviewNote}
        </Notice>
      )}
      <TabsNav
        label="Secções do editor"
        items={[
          { href: base, label: "Detalhes", exact: true },
          { href: `${base}/curriculo`, label: "Currículo" },
          { href: `${base}/avaliacao`, label: "Avaliação" },
          { href: `${base}/estudantes`, label: "Estudantes" },
          { href: `${base}/publicacao`, label: "Publicação" },
        ]}
      />
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}
