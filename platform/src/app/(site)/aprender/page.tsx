import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { CourseCover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, Progress, ProgressRing } from "@/components/ui";
import { formatDate, formatRelative } from "@/lib/format";
import { plural } from "@/lib/text";
import { requireUserPage } from "@/server/auth/session";
import { listCourseCards } from "@/server/catalog/queries";
import { listCertificates } from "@/server/certificates/service";
import { getDb } from "@/server/db/client";
import { myLearning } from "@/server/learning/progress";

export const metadata: Metadata = { title: "A minha aprendizagem" };

export default async function LearningDashboard({ searchParams }: { searchParams: Promise<{ bemvindo?: string; senha?: string }> }) {
  const user = await requireUserPage("/aprender");
  const sp = await searchParams;
  const db = await getDb();
  const [items, certs] = await Promise.all([myLearning(db, user.id), listCertificates(db, user.id)]);
  const current = items.find((i) => i.percent < 100) ?? items[0];
  const recommended = items.length < 3 ? (await listCourseCards(db, { limit: 8 })).filter((c) => !items.some((i) => i.course.id === c.id)).slice(0, 4) : [];
  const completedLessons = items.reduce((s, i) => s + i.completed, 0);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="container section-tight stack" style={{ ["--gap" as string]: "36px" }}>
      {sp.bemvindo && <Notice tone="success">Conta criada! Enviámos um email de confirmação. Escolhe o teu primeiro curso para começar.</Notice>}
      {sp.senha && <Notice tone="success">Palavra-passe alterada. Já entraste com a nova palavra-passe.</Notice>}

      <div className="welcome">
        <div className="stack" style={{ ["--gap" as string]: "8px" }}>
          <span className="eyebrow">A minha aprendizagem</span>
          <h1 className="display-2">
            Olá, <em className="accent">{firstName}</em>.
          </h1>
        </div>
        <div className="row" style={{ ["--gap" as string]: "28px" }}>
          <div>
            <div className="h2 tabular">{items.length}</div>
            <div className="small muted">{items.length === 1 ? "curso" : "cursos"}</div>
          </div>
          <div>
            <div className="h2 tabular">{completedLessons}</div>
            <div className="small muted">aulas concluídas</div>
          </div>
          <div>
            <div className="h2 tabular">{certs.length}</div>
            <div className="small muted">{certs.length === 1 ? "certificado" : "certificados"}</div>
          </div>
        </div>
      </div>

      {current ? (
        <section className="continue-card rise">
          <div className="cover">
            <CourseCover seed={current.course.coverSeed} title={current.course.title} rounded={false} />
          </div>
          <div className="body">
            <span className="eyebrow" style={{ color: "var(--saffron)" }}>
              {current.percent === 0 ? "Começa agora" : current.percent === 100 ? "Concluído" : "Continua onde paraste"}
            </span>
            <h2 className="h1" style={{ color: "#fffdf8" }}>
              {current.course.title}
            </h2>
            {current.nextLesson && (
              <p style={{ opacity: 0.8 }}>
                Próxima aula: <strong>{current.nextLesson.title}</strong>
              </p>
            )}
            <div className="row" style={{ ["--gap" as string]: "14px" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Progress value={current.percent} label={`Progresso em ${current.course.title}`} />
              </div>
              <span className="small tabular">
                {current.completed}/{current.total} aulas · {current.percent}%
              </span>
            </div>
            <div className="row">
              <Link
                href={current.nextLesson ? `/aprender/${current.course.slug}/${current.nextLesson.id}` : `/aprender/${current.course.slug}`}
                className="btn btn-lg btn-accent"
              >
                <Icon name="play" size={18} fill="currentColor" /> {current.percent === 0 ? "Começar" : "Continuar"}
              </Link>
              {current.certificateCode && (
                <Link href={`/certificado/${current.certificateCode}`} className="btn btn-lg" style={{ ["--btn-bg" as string]: "rgb(255 255 255 / 12%)" }}>
                  <Icon name="award" size={18} /> Certificado
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <EmptyState icon="book" title="Ainda não começaste nenhum curso" action={{ href: "/cursos", label: "Explorar cursos" }}>
          Há cursos gratuitos para começares hoje, e todos têm uma aula de pré-visualização.
        </EmptyState>
      )}

      {items.length > 0 && (
        <section className="stack" style={{ ["--gap" as string]: "18px" }}>
          <h2 className="h2">Os meus cursos</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))", ["--gap" as string]: "16px" }}>
            {items.map((i) => (
              <Link key={i.course.id} href={`/aprender/${i.course.slug}`} className="learning-card">
                <div className="thumb">
                  <CourseCover seed={i.course.coverSeed} title={i.course.title} rounded={false} />
                </div>
                <div className="stack" style={{ ["--gap" as string]: "8px", minWidth: 0 }}>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.2 }}>{i.course.title}</strong>
                  <span className="small muted">{i.instructorName}</span>
                  <div className="row" style={{ ["--gap" as string]: "10px", marginTop: "auto" }}>
                    <div style={{ flex: 1 }}>
                      <Progress value={i.percent} thin />
                    </div>
                    <span className="xsmall tabular muted">{i.percent}%</span>
                  </div>
                  <span className="xsmall faint">
                    {i.lastActivityAt ? `Última atividade ${formatRelative(i.lastActivityAt)}` : `Inscrito em ${formatDate(i.grantedAt)}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {certs.length > 0 && (
        <section className="stack" style={{ ["--gap" as string]: "18px" }}>
          <h2 className="h2">Certificados</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", ["--gap" as string]: "14px" }}>
            {certs.map((c) => (
              <Link key={c.code} href={`/certificado/${c.code}`} className="card card-pad row" style={{ textDecoration: "none", ["--gap" as string]: "14px" }}>
                <ProgressRing value={100} size={48} />
                <div className="stack" style={{ ["--gap" as string]: "2px" }}>
                  <strong>{c.courseTitle}</strong>
                  <span className="small muted">
                    {formatDate(c.issuedAt)} · <span className="mono">{c.code}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="stack" style={{ ["--gap" as string]: "18px" }}>
          <div className="spread">
            <h2 className="h2">Recomendados para ti</h2>
            <Link href="/cursos" className="link">
              Ver catálogo
            </Link>
          </div>
          <div className="course-grid">
            {recommended.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        </section>
      )}
      {items.length > 0 && (
        <p className="small muted">
          {plural(items.length, "curso ativo", "cursos ativos")}. O progresso é guardado na tua conta e acompanha-te em qualquer dispositivo.
        </p>
      )}
    </div>
  );
}
