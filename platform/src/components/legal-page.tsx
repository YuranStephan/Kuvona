import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { getDb } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import styles from "@/styles/pages.module.css";

const titles = {
  terms: "Termos de utilização",
  privacy: "Privacidade",
  refunds: "Política de reembolso",
} as const;

export async function LegalPage({ kind }: { kind: keyof typeof titles }) {
  const db = await getDb();
  const [content, school] = await Promise.all([
    getSetting(db, "content"),
    getSetting(db, "school"),
  ]);
  return (
    <div className="container-narrow section">
      <article className={styles.legal}>
        <div className="legal-draft">
          Rascunho — rever com um jurista antes de aceitar pagamentos reais.
        </div>
        <span className="eyebrow">Informação para o estudante</span>
        <h1 className="display-2">{titles[kind]}</h1>
        <p className={styles.legalMeta}>
          Documento de trabalho de {school.legalName || "Academia Kuvona"}
          {school.nuit ? ` · NUIT ${school.nuit}` : ""}. A identidade legal, as
          condições e os prazos precisam de validação antes da publicação final.
        </p>
        <nav className={styles.legalNav} aria-label="Informação legal">
          <Link className="link" href="/termos">
            Termos
          </Link>
          <Link className="link" href="/privacidade">
            Privacidade
          </Link>
          <Link className="link" href="/reembolsos">
            Reembolsos
          </Link>
          <Link className="link" href="/sobre#apoio">
            Apoio
          </Link>
        </nav>
        <Markdown text={content[kind]} />
      </article>
    </div>
  );
}
