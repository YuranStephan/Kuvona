import { formatDate, formatDuration } from "@/lib/format";
import { Logo } from "./cover";

type Cert = {
  code: string;
  recipientName: string;
  courseTitle: string;
  instructorName: string;
  scorePercent: number | null;
  issuedAt: Date;
  durationSeconds: number;
};

/** A4-landscape certificate; scales with its container (container query units). */
export function CertificateArt({ cert, verifyUrl }: { cert: Cert; verifyUrl: string }) {
  return (
    <article className="certificate" aria-label={`Certificado de ${cert.recipientName}`}>
      <svg className="certificate-border" viewBox="0 0 1414 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="cert-band" width="48" height="48" patternUnits="userSpaceOnUse">
            <rect width="48" height="48" fill="#16130E" />
            <path d="M24 4 44 24 24 44 4 24Z" fill="#E0512B" />
            <path d="M24 14 34 24 24 34 14 24Z" fill="#F2A83B" />
            <circle cx="24" cy="24" r="3" fill="#16130E" />
            <circle cx="0" cy="0" r="4" fill="#0E5E57" />
            <circle cx="48" cy="48" r="4" fill="#0E5E57" />
            <circle cx="48" cy="0" r="4" fill="#0E5E57" />
            <circle cx="0" cy="48" r="4" fill="#0E5E57" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1414" height="48" fill="url(#cert-band)" />
        <rect x="0" y="952" width="1414" height="48" fill="url(#cert-band)" />
        <rect x="70" y="80" width="1274" height="840" fill="none" stroke="#16130E" strokeWidth="1.5" />
        <rect x="80" y="90" width="1254" height="820" fill="none" stroke="#CDBFA6" strokeWidth="1" />
        <circle cx="1240" cy="830" r="62" fill="#F2A83B" opacity="0.9" />
        <circle cx="1240" cy="830" r="44" fill="none" stroke="#16130E" strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
      <div className="certificate-inner">
        <div style={{ display: "grid", justifyItems: "center", gap: "1.4cqw" }}>
          <div style={{ fontSize: "2.3cqw" }}>
            <Logo size={34} />
          </div>
          <span className="small-caps">Certificado de conclusão</span>
        </div>
        <div style={{ display: "grid", alignContent: "center", gap: "1.6cqw" }}>
          <p className="body-text">Certificamos que</p>
          <p className="name">{cert.recipientName}</p>
          <p className="body-text">concluiu com aproveitamento o curso</p>
          <p className="course">{cert.courseTitle}</p>
          <p className="body-text">
            {cert.durationSeconds > 0 && `${formatDuration(cert.durationSeconds)} de conteúdo · `}
            {cert.scorePercent !== null ? `avaliação final ${cert.scorePercent}%` : "todas as aulas concluídas"}
          </p>
        </div>
        <div className="foot">
          <div className="sig" style={{ textAlign: "left" }}>
            <strong>{cert.instructorName}</strong>
            <div className="muted">Instrutor</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="muted">Emitido em {formatDate(cert.issuedAt)}</div>
            <div className="mono" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>
              {cert.code}
            </div>
            <div className="muted" style={{ fontSize: "1.05cqw" }}>
              Verificar em {verifyUrl}
            </div>
          </div>
          <div className="sig" style={{ textAlign: "right", marginRight: "9cqw" }}>
            <strong>Academia Kuvona</strong>
            <div className="muted">Maputo, Moçambique</div>
          </div>
        </div>
      </div>
    </article>
  );
}
