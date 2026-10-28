import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuizRunner } from "@/components/classroom/quiz";
import { ClassroomShell } from "@/components/classroom/shell";
import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUserPage } from "@/server/auth/session";
import { certificateEligibility, issueCertificateIfEligible } from "@/server/certificates/service";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { getClassroom } from "@/server/learning/progress";
import { PASS_PERCENT, getQuizForStudent } from "@/server/learning/quiz";

export const metadata: Metadata = { title: "Avaliação final" };

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage(`/aprender/${slug}/avaliacao`);
  const db = await getDb();
  let classroom;
  try {
    classroom = await getClassroom(db, user, slug);
  } catch (error) {
    if (error instanceof DomainError && error.code === "forbidden") redirect(`/cursos/${slug}`);
    notFound();
  }
  const quiz = await getQuizForStudent(db, user, classroom.course.id);
  // A course without questions certifies on lesson completion alone.
  const certificate = classroom.access === "enrolled" ? await issueCertificateIfEligible(db, user.id, classroom.course.id) : null;
  const eligibility = await certificateEligibility(db, user.id, classroom.course.id);

  return (
    <ClassroomShell data={classroom}>
      <div className="quiz" style={{ gap: 10 }}>
        <span className="eyebrow" style={{ color: "var(--saffron)" }}>
          Avaliação final
        </span>
        <h1 className="h1" style={{ color: "#fffdf8" }}>
          {classroom.course.title}
        </h1>
        <p className="muted">
          {quiz.questions.length
            ? `${quiz.questions.length} perguntas · precisas de ${PASS_PERCENT}% para aprovar · podes repetir sempre que quiseres. A melhor nota conta.`
            : "Este curso não tem avaliação: o certificado é emitido quando concluis todas as aulas."}
        </p>
      </div>

      {certificate && (
        <div className="quiz">
          <div className="quiz-score">
            <Icon name="award" size={44} style={{ color: "var(--saffron)" }} />
            <h2 className="h2" style={{ color: "#fffdf8" }}>
              Parabéns! Concluíste o curso.
            </h2>
            <p className="muted">
              Certificado <span className="mono">{certificate.code}</span>
              {eligibility.bestScore !== null && ` · melhor nota ${eligibility.bestScore}%`}
            </p>
            <Link href={`/certificado/${certificate.code}`} className="btn btn-lg btn-accent">
              Ver e partilhar o certificado
            </Link>
          </div>
        </div>
      )}

      {!quiz.unlocked ? (
        <div className="quiz">
          <EmptyState icon="lock" title="Avaliação bloqueada" action={classroom.nextLessonId ? { href: `/aprender/${slug}/${classroom.nextLessonId}`, label: "Continuar as aulas" } : undefined}>
            Conclui todas as aulas para desbloquear a avaliação. Faltam {quiz.remainingLessons} {quiz.remainingLessons === 1 ? "aula" : "aulas"}.
          </EmptyState>
        </div>
      ) : quiz.questions.length > 0 && !certificate ? (
        <QuizRunner courseId={classroom.course.id} questions={quiz.questions} passPercent={PASS_PERCENT} />
      ) : null}

      {quiz.attempts.length > 0 && (
        <div className="quiz">
          <div className="cl-card">
            <strong>Tentativas anteriores</strong>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18 }} className="small">
              {quiz.attempts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {formatDateTime(a.createdAt)} — {a.scorePercent}% {a.passed ? "✓ aprovado" : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </ClassroomShell>
  );
}
