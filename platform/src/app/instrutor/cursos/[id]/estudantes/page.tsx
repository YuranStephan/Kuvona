import Link from "next/link";
import { EmptyState, Progress } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { courseStudents, lessonFunnel } from "@/server/analytics/service";
import { getDb } from "@/server/db/client";
import { loadEditor } from "../editor";

export default async function StudentsEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course } = await loadEditor(id);
  const db = await getDb();
  const [students, funnel] = await Promise.all([
    courseStudents(db, course.id),
    lessonFunnel(db, course.id),
  ]);
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <section className="panel">
        <header className="panel-head">
          <h2 className="h3">
            Estudantes inscritos{" "}
            <span className="muted">({students.length})</span>
          </h2>
        </header>
        {students.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudante</th>
                  <th>Progresso</th>
                  <th>Última atividade</th>
                  <th>Melhor nota</th>
                  <th>Certificado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId}>
                    <td>
                      <strong>{s.name}</strong>
                      <div className="small muted">{s.email}</div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <Progress
                        value={s.total ? (s.completed / s.total) * 100 : 0}
                        label={`${s.completed}/${s.total} aulas`}
                      />
                    </td>
                    <td className="small">
                      {s.lastActivityAt
                        ? formatDateTime(s.lastActivityAt)
                        : "Ainda não começou"}
                    </td>
                    <td>{s.bestScore === null ? "—" : `${s.bestScore}%`}</td>
                    <td>
                      {s.certificateCode ? (
                        <Link
                          className="link small"
                          href={`/certificado/${s.certificateCode}`}
                        >
                          Ver certificado
                        </Link>
                      ) : (
                        <span className="muted">Por concluir</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="users" title="As primeiras inscrições começam aqui">
            Quando houver estudantes com acesso, poderás acompanhar o progresso
            e as avaliações.
          </EmptyState>
        )}
      </section>
      <section className="form-section">
        <h2>Conclusão por aula</h2>
        <p className="small muted">
          Número de estudantes com acesso ativo que concluíram cada aula.
        </p>
        <div className="hbars">
          {funnel.map((l) => (
            <div className="hbar" key={l.lessonId}>
              <span>{l.title}</span>
              <div className="hbar-track">
                <i
                  style={{
                    width: `${students.length ? (l.completions / students.length) * 100 : 0}%`,
                    minWidth: l.completions ? 2 : 0,
                  }}
                />
              </div>
              <strong>{l.completions}</strong>
            </div>
          ))}
        </div>
        {!funnel.length && (
          <p className="muted small">
            Adiciona aulas ao currículo para acompanhar este percurso.
          </p>
        )}
      </section>
    </div>
  );
}
