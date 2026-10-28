import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { Avatar, EmptyState, Stars } from "@/components/ui";
import { Icon } from "@/components/icon";
import { getDb } from "@/server/db/client";
import { getInstructorProfile } from "@/server/catalog/queries";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Conhece o instrutor" };
export default async function InstructorProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const profile = await getInstructorProfile(await getDb(), id);
  if (!profile) notFound();
  const { instructor, courses, stats } = profile;
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <Link className="link-quiet small" href="/cursos">
            <Icon name="arrowLeft" size={15} /> Todos os cursos
          </Link>
          <div className={styles.profileHero}>
            <div>
              <span className="eyebrow">Quem te ajuda a aprender</span>
              <h1 className="display-2">{instructor.name}</h1>
              {instructor.headline && (
                <p className="lead">{instructor.headline}</p>
              )}
              <div className={styles.stats}>
                <span className={styles.stat}>
                  <strong>{stats.courses}</strong>{" "}
                  {stats.courses === 1
                    ? "curso publicado"
                    : "cursos publicados"}
                </span>
                <span className={styles.stat}>
                  <strong>{stats.students}</strong>{" "}
                  {stats.students === 1
                    ? "estudante inscrito"
                    : "estudantes inscritos"}
                </span>
                <span className={styles.stat}>
                  <strong>{stats.reviews}</strong>{" "}
                  {stats.reviews === 1 ? "avaliação" : "avaliações"}
                </span>
                {stats.rating !== null && stats.reviews > 0 && (
                  <span className={styles.stat}>
                    <strong>
                      {Number(stats.rating).toLocaleString("pt-PT")}
                    </strong>
                    <Stars value={Number(stats.rating)} />
                  </span>
                )}
              </div>
            </div>
            <Avatar name={instructor.name} size={112} />
          </div>
        </div>
      </section>
      <section className="container section">
        <div className={styles.pageGrid}>
          <div>
            <span className="eyebrow">Um pouco sobre o instrutor</span>
            <h2 className="display-2" style={{ marginBlock: "16px 24px" }}>
              Conhecimento que se partilha.
            </h2>
            <p className={styles.bio}>
              {instructor.bio ||
                "Este instrutor ainda não acrescentou a sua apresentação. Conhece os objetivos e o programa dos seus cursos abaixo."}
            </p>
          </div>
          <aside className={styles.card}>
            <h2 className="h3">Encontra o teu percurso</h2>
            <p>
              Abre os detalhes para conhecer os requisitos, as aulas e a
              pré-visualização de cada curso antes de te inscreveres.
            </p>
            <Link className="link" href="/cursos">
              Explorar outras áreas
            </Link>
          </aside>
        </div>
      </section>
      <section className="container section-tight">
        <div className="section-heading">
          <h2 className="display-2">Cursos de {instructor.name}</h2>
        </div>
        {courses.length ? (
          <div className={styles.courseGrid}>
            {courses.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState icon="book" title="Ainda sem cursos publicados">
            Quando houver cursos publicados deste instrutor, vais encontrá-los
            aqui.
          </EmptyState>
        )}
      </section>
    </>
  );
}
