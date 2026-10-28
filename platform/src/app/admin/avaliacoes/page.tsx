import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { setReviewHiddenAction } from "@/actions/admin";
import { PageHeader } from "@/components/workspace";
import { EmptyState, Stars } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { courses, reviews, users } from "@/server/db/schema";

export const metadata: Metadata = { title: "Avaliações" };

export default async function ReviewsModeration() {
  const rows = await (await getDb())
    .select({ review: reviews, userName: users.name, courseTitle: courses.title })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(courses, eq(courses.id, reviews.courseId))
    .orderBy(desc(reviews.createdAt))
    .limit(200);
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Avaliações">
        Só estudantes inscritos com pelo menos uma aula concluída podem avaliar. Esconde avaliações abusivas; não alteres notas.
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon="star" title="Ainda não há avaliações" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Estudante · curso</th>
                <th>Nota</th>
                <th>Comentário</th>
                <th>Data</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ review, userName, courseTitle }) => (
                <tr key={review.id} style={review.hiddenAt ? { opacity: 0.55 } : undefined}>
                  <td>
                    <strong>{userName}</strong>
                    <div className="xsmall muted">{courseTitle}</div>
                  </td>
                  <td>
                    <Stars value={review.rating} size={13} />
                  </td>
                  <td style={{ maxWidth: 420 }}>{review.body || <span className="muted">—</span>}</td>
                  <td className="nowrap">{formatDateTime(review.createdAt)}</td>
                  <td className="num">
                    <form action={setReviewHiddenAction.bind(null, review.id, !review.hiddenAt)}>
                      <button type="submit" className="btn btn-ghost btn-xs">
                        {review.hiddenAt ? "Mostrar" : "Esconder"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
