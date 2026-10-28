import Link from "next/link";
import { CourseCover, Logo } from "@/components/cover";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-art" aria-hidden="true">
        <div className="auth-art-pattern">
          <CourseCover seed={77017} title="" rounded={false} className="" />
        </div>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo tone="paper" />
        </Link>
        <div className="stack" style={{ ["--gap" as string]: "18px" }}>
          <p className="auth-quote">
            Cada aula é um passo. <em className="accent" style={{ color: "var(--saffron)" }}>Começa hoje.</em>
          </p>
          <p style={{ maxWidth: "38ch", color: "rgb(246 241 231 / 75%)" }}>
            Cursos práticos em português, progresso guardado na tua conta e certificados com código verificável.
          </p>
        </div>
      </aside>
      <main id="conteudo" className="auth-main">
        <div className="auth-card">
          <Link href="/" className="mobile-only" style={{ textDecoration: "none" }}>
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
