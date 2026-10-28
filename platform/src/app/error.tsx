"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import styles from "@/styles/pages.module.css";

export default function ErrorPage({
  error,
  reset,
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry?: () => void;
}) {
  const digest =
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;
  return (
    <section className={`container ${styles.system}`} role="alert">
      <div className={styles.systemContent}>
        <div className={styles.systemIcon}>
          <Icon name="alert" size={32} />
        </div>
        <span className="eyebrow">Uma pausa inesperada</span>
        <h1 className="display-2">
          Não foi possível
          <br />
          <em className="accent">abrir esta página.</em>
        </h1>
        <p>
          A ligação ou o serviço podem estar temporariamente indisponíveis.
          Tenta novamente. Se continuar a acontecer, contacta o apoio da
          academia.
        </p>
        {digest && (
          <p className="small muted">
            Referência do erro: <code>{digest}</code>
          </p>
        )}
        <div className={styles.systemActions}>
          <button className="btn" onClick={() => (retry ? retry() : reset())}>
            Tentar novamente <Icon name="arrowRight" size={16} />
          </button>
          <Link className="btn btn-outline" href="/cursos">
            Ver cursos
          </Link>
          <Link className="btn btn-ghost" href="/sobre#apoio">
            Contactar apoio
          </Link>
        </div>
      </div>
    </section>
  );
}
