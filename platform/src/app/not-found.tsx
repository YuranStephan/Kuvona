import Link from "next/link";
import { Icon } from "@/components/icon";
import styles from "@/styles/pages.module.css";

export default function NotFound() {
  return (
    <main id="conteudo" className={`container ${styles.system}`}>
      <div className={styles.systemContent}>
        <div className={styles.systemIcon}>
          <Icon name="compass" size={34} />
        </div>
        <span className="eyebrow">404 · Um desvio no caminho</span>
        <h1 className="display-2">
          Esta página não está
          <br />
          <em className="accent">por aqui.</em>
        </h1>
        <p>
          O endereço pode ter mudado ou a página já não estar disponível. Há
          outros caminhos para continuar a aprender.
        </p>
        <div className={styles.systemActions}>
          <Link className="btn" href="/cursos">
            Explorar cursos <Icon name="arrowRight" size={16} />
          </Link>
          <Link className="btn btn-outline" href="/">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
