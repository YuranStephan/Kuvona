import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import { findCertificateByCode } from "@/server/certificates/service";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = {
  title: "Verificação de certificado",
  robots: { index: false },
};

export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await findCertificateByCode(
    await getDb(),
    decodeURIComponent(code),
  );
  const valid = cert?.eligible;
  return (
    <div className="container-narrow section" style={{ maxWidth: 640 }}>
      <div className="card status-hero">
        <span className={`status-icon ${valid ? "ok" : "bad"}`}>
          <Icon name={valid ? "shield" : "alert"} size={38} />
        </span>
        <span className="mono small">
          {decodeURIComponent(code).toUpperCase()}
        </span>
        {valid ? (
          <>
            <h1 className="h2">Certificado válido</h1>
            <dl className="dl" style={{ textAlign: "left", marginTop: 8 }}>
              <dt>Estudante</dt>
              <dd>{cert.recipientName}</dd>
              <dt>Curso</dt>
              <dd>{cert.courseTitle}</dd>
              <dt>Instrutor</dt>
              <dd>{cert.instructorName}</dd>
              <dt>Emitido em</dt>
              <dd>{formatDate(cert.issuedAt)}</dd>
              {cert.scorePercent !== null && (
                <>
                  <dt>Avaliação final</dt>
                  <dd>{cert.scorePercent}%</dd>
                </>
              )}
            </dl>
            <p className="xsmall muted">
              Certificado de conclusão emitido pela Academia Kuvona. Não é um
              diploma de ensino oficial.
            </p>
          </>
        ) : cert?.revokedAt ? (
          <>
            <h1 className="h2">Certificado revogado</h1>
            <p className="muted">
              Este certificado foi emitido mas já não é válido. Contacta a
              academia para esclarecimentos.
            </p>
          </>
        ) : cert ? (
          <>
            <h1 className="h2">Critérios de conclusão por validar</h1>
            <p className="muted">
              Este percurso não cumpre atualmente todos os requisitos de
              conclusão. Contacta a academia para esclarecimentos.
            </p>
          </>
        ) : (
          <>
            <h1 className="h2">Código não encontrado</h1>
            <p className="muted">
              Confirma o código. Se o problema continuar, o certificado pode não
              ser autêntico.
            </p>
          </>
        )}
        <Link href="/verificar" className="link small">
          Verificar outro código
        </Link>
      </div>
    </div>
  );
}
