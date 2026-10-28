import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getCurrentUser } from "@/server/auth/session";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = {
  title: "Sem acesso",
  robots: { index: false, follow: false },
};
export default async function NoAccess() {
  const user = await getCurrentUser();
  return (
    <section className={`container ${styles.system}`}>
      <div className={styles.systemContent}>
        <div className={styles.systemIcon}>
          <Icon name="lock" size={32} />
        </div>
        <span className="eyebrow">Área reservada</span>
        <h1 className="display-2">
          Não tens permissão
          <br />
          <em className="accent">para esta área.</em>
        </h1>
        <p>
          {user
            ? "A conta com que entraste não tem o papel necessário para abrir esta página. Se esperavas ter acesso, contacta a equipa para verificar a tua conta."
            : "Entra na tua conta para continuar. Algumas áreas estão disponíveis apenas para instrutores ou para a gestão."}
        </p>
        <div className={styles.systemActions}>
          {user ? (
            <Link className="btn" href="/aprender">
              A minha aprendizagem <Icon name="arrowRight" size={16} />
            </Link>
          ) : (
            <Link className="btn" href="/entrar">
              Entrar na minha conta
            </Link>
          )}
          <Link className="btn btn-outline" href="/cursos">
            Explorar cursos
          </Link>
          <Link className="btn btn-ghost" href="/sobre#apoio">
            Pedir ajuda
          </Link>
        </div>
      </div>
    </section>
  );
}
