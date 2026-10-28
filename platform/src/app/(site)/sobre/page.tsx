import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { Icon } from "@/components/icon";
import { getDb } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = {
  title: "Sobre a Kuvona",
  description:
    "Cursos práticos em português para abrir novas possibilidades em Moçambique.",
};

export default async function AboutPage() {
  const db = await getDb();
  const [school, content] = await Promise.all([
    getSetting(db, "school"),
    getSetting(db, "content"),
  ]);
  const hasContact = Boolean(
    school.supportEmail || school.supportPhone || school.whatsapp,
  );
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <span className="eyebrow">A nossa academia</span>
          <h1 className="display-2" style={{ whiteSpace: "pre-line" }}>
            {content.aboutTitle}
          </h1>
          <p className="lead">{content.aboutIntro}</p>
          <Link className="btn" href="/cursos">
            Encontra o teu próximo curso <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </section>
      <section className="container section">
        <div className={styles.pageGrid}>
          <Markdown text={content.aboutBody} />
          <aside className={styles.card}>
            <h2 className="h3">Partilha o que sabes</h2>
            <p>Transforma a tua experiência num percurso de aprendizagem.</p>
            <Link className="btn btn-outline" href="/ensinar">
              Ensinar na Kuvona <Icon name="arrowRight" size={16} />
            </Link>
          </aside>
        </div>
      </section>
      <section id="apoio" className="container section">
        <div className={styles.contact}>
          <span className="eyebrow">Estamos por perto</span>
          <h2 className="display-2">Precisas de ajuda?</h2>
          <p>
            Para dúvidas sobre cursos, inscrições, pagamentos ou a tua conta,
            contacta a equipa de {school.legalName || "Academia Kuvona"}.
          </p>
          {hasContact ? (
            <div className={styles.contactLinks}>
              {school.supportEmail && (
                <a href={`mailto:${school.supportEmail}`}>
                  <Icon name="mail" size={18} /> {school.supportEmail}
                </a>
              )}
              {school.supportPhone && (
                <a href={`tel:${school.supportPhone.replace(/[^+\d]/g, "")}`}>
                  <Icon name="phone" size={18} /> {school.supportPhone}
                </a>
              )}
              {school.whatsapp && (
                <a
                  href={`https://wa.me/${school.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="message" size={18} /> WhatsApp · +
                  {school.whatsapp}
                </a>
              )}
            </div>
          ) : (
            <p>
              Os contactos de apoio ainda não foram configurados pela academia.
              Serão apresentados aqui quando estiverem disponíveis.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
