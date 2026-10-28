import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateArt } from "@/components/certificate";
import { CopyButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { PrintButton } from "@/components/print-button";
import { Notice } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { findCertificateByCode } from "@/server/certificates/service";
import { getDb } from "@/server/db/client";
import { appUrl } from "@/server/email";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await findCertificateByCode(await getDb(), (await params).code);
  return {
    title: cert ? `Certificado — ${cert.courseTitle}` : "Certificado",
    robots: { index: false },
  };
}

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const cert = await findCertificateByCode(await getDb(), code);
  if (!cert) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === cert.userId;
  const verifyUrl = `${appUrl()}/verificar/${cert.code}`;
  return (
    <div
      className="container section-tight stack"
      style={{ ["--gap" as string]: "24px" }}
    >
      <div className="spread no-print">
        <div className="stack" style={{ ["--gap" as string]: "6px" }}>
          <span className="eyebrow">Certificado</span>
          <h1 className="h1">{cert.courseTitle}</h1>
        </div>
        {cert.eligible && (
          <div className="row">
            <PrintButton />
            <CopyButton value={verifyUrl} label="Copiar link de verificação" />
          </div>
        )}
      </div>
      {cert.revokedAt ? (
        <Notice tone="error">
          Este certificado foi revogado e já não é válido.
        </Notice>
      ) : !cert.eligible ? (
        <Notice tone="warning">
          Este percurso não cumpre atualmente todos os requisitos de conclusão.
          Confirma o progresso e a avaliação com a academia.
        </Notice>
      ) : (
        <CertificateArt
          cert={cert}
          verifyUrl={verifyUrl.replace(/^https?:\/\//, "")}
        />
      )}
      {isOwner && cert.eligible && (
        <p className="small muted no-print">
          <Icon
            name="info"
            size={14}
            style={{ display: "inline", verticalAlign: -2 }}
          />{" "}
          Para guardar em PDF, escolhe “Guardar como PDF” na janela de impressão
          (orientação horizontal). Qualquer pessoa pode confirmar a
          autenticidade em{" "}
          <Link href={`/verificar/${cert.code}`} className="link">
            /verificar/{cert.code}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
