import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { EmptyState } from "@/components/ui";
import { requireUserPage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { listWishlist } from "@/server/catalog/queries";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = {
  title: "Lista de desejos",
  robots: { index: false, follow: false },
};
export default async function WishlistPage() {
  const user = await requireUserPage("/desejos");
  const courses = await listWishlist(await getDb(), user.id);
  return (
    <div className="container section">
      <header className="section-heading">
        <div>
          <span className="eyebrow">Guardados para mais tarde</span>
          <h1 className="display-2" style={{ marginBlock: 16 }}>
            A tua lista de desejos
          </h1>
          <p className="lead">
            Regressa às ideias que despertaram a tua curiosidade. Conhece os
            detalhes antes de te inscreveres.
          </p>
        </div>
        <span className="badge">
          {courses.length} {courses.length === 1 ? "curso" : "cursos"}
        </span>
      </header>
      {courses.length ? (
        <div className={styles.courseGrid}>
          {courses.map((course, i) => (
            <CourseCard course={course} key={course.id} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="heart"
          title="O teu próximo interesse está à espera"
          action={{ href: "/cursos", label: "Explorar cursos" }}
        >
          Guarda um curso através do coração na página de detalhes. Os cursos
          guardados ficam associados à tua conta.
        </EmptyState>
      )}
    </div>
  );
}
