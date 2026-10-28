import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/server/auth/service";
import { isLocalMode } from "@/server/config";
import { Logo } from "./cover";
import { Icon } from "./icon";
import { Avatar } from "./ui";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <>
      {isLocalMode() && (
        <div className="local-banner">
          Modo local: base de dados neste computador e simulador de pagamentos ativo. <Link href="/entrar">Contas de teste</Link>
        </div>
      )}
      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="logo-link" aria-label="Academia Kuvona — início">
            <Logo />
          </Link>
          <form action="/cursos" className="header-search" role="search">
            <Icon name="search" size={18} />
            <input className="input" type="search" name="q" placeholder="O que queres aprender hoje?" aria-label="Pesquisar cursos" />
          </form>
          <nav className="header-nav" aria-label="Principal">
            <Link href="/cursos" className="nav-link desktop-only">
              Cursos
            </Link>
            {(!user || user.role === "student") && (
              <Link href="/ensinar" className="nav-link desktop-only">
                Ensinar na Kuvona
              </Link>
            )}
            {user?.role === "instructor" && (
              <Link href="/instrutor" className="nav-link desktop-only">
                Área do instrutor
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" className="nav-link desktop-only">
                Gestão
              </Link>
            )}
            {user ? (
              <>
                <Link href="/aprender" className="nav-link desktop-only">
                  A minha aprendizagem
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Link href="/entrar" className="nav-link">
                  Entrar
                </Link>
                <Link href="/registar" className="btn btn-sm desktop-only">
                  Criar conta
                </Link>
                <MobileMenu />
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  return (
    <details className="menu">
      <summary className="menu-trigger" aria-label="Menu da conta">
        <Avatar name={user.name} size={34} />
        <Icon name="chevronDown" size={16} />
      </summary>
      <div className="menu-panel">
        <div className="menu-head">
          <strong>{user.name}</strong>
          <div className="small muted">{user.email}</div>
        </div>
        <Link href="/aprender" className="menu-item">
          <Icon name="book" size={18} /> A minha aprendizagem
        </Link>
        <Link href="/cursos" className="menu-item mobile-only">
          <Icon name="compass" size={18} /> Explorar cursos
        </Link>
        <Link href="/desejos" className="menu-item">
          <Icon name="heart" size={18} /> Lista de desejos
        </Link>
        <Link href="/pedidos" className="menu-item">
          <Icon name="receipt" size={18} /> Pedidos e pagamentos
        </Link>
        <Link href="/conta" className="menu-item">
          <Icon name="user" size={18} /> Conta e segurança
        </Link>
        {(user.role === "instructor" || user.role === "admin") && (
          <>
            <div className="menu-sep" />
            <Link href="/instrutor" className="menu-item">
              <Icon name="layout" size={18} /> Área do instrutor
            </Link>
          </>
        )}
        {user.role === "admin" && (
          <Link href="/admin" className="menu-item">
            <Icon name="shield" size={18} /> Gestão da academia
          </Link>
        )}
        {user.role === "student" && (
          <Link href="/ensinar" className="menu-item">
            <Icon name="sparkle" size={18} /> Ensinar na Kuvona
          </Link>
        )}
        <div className="menu-sep" />
        <form action={logoutAction}>
          <button className="menu-item" type="submit">
            <Icon name="logout" size={18} /> Terminar sessão
          </button>
        </form>
      </div>
    </details>
  );
}

function MobileMenu() {
  return (
    <details className="menu mobile-only">
      <summary className="btn btn-ghost btn-icon" aria-label="Abrir menu">
        <Icon name="menu" />
      </summary>
      <div className="menu-panel">
        <Link href="/cursos" className="menu-item">
          <Icon name="compass" size={18} /> Explorar cursos
        </Link>
        <Link href="/ensinar" className="menu-item">
          <Icon name="sparkle" size={18} /> Ensinar na Kuvona
        </Link>
        <Link href="/verificar" className="menu-item">
          <Icon name="award" size={18} /> Verificar certificado
        </Link>
        <div className="menu-sep" />
        <Link href="/registar" className="menu-item">
          <Icon name="user" size={18} /> Criar conta
        </Link>
      </div>
    </details>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-band" aria-hidden="true" />
      <div className="container footer-grid">
        <div className="stack" style={{ ["--gap" as string]: "18px" }}>
          <Logo tone="paper" />
          <p style={{ maxWidth: "34ch" }}>
            Cursos práticos em português, pensados para quem aprende no telemóvel. <em>Kuvona</em> quer dizer <em>ver</em>: abrir os olhos a novas
            possibilidades.
          </p>
        </div>
        <div>
          <h4>Aprender</h4>
          <ul>
            <li>
              <Link href="/cursos">Todos os cursos</Link>
            </li>
            <li>
              <Link href="/cursos?preco=gratis">Cursos gratuitos</Link>
            </li>
            <li>
              <Link href="/aprender">A minha aprendizagem</Link>
            </li>
            <li>
              <Link href="/verificar">Verificar certificado</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Academia</h4>
          <ul>
            <li>
              <Link href="/sobre">Sobre a Kuvona</Link>
            </li>
            <li>
              <Link href="/ensinar">Ensinar na Kuvona</Link>
            </li>
            <li>
              <Link href="/sobre#apoio">Apoio</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li>
              <Link href="/termos">Termos de utilização</Link>
            </li>
            <li>
              <Link href="/privacidade">Privacidade</Link>
            </li>
            <li>
              <Link href="/reembolsos">Política de reembolso</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Academia Kuvona · Maputo, Moçambique</span>
        <span>Pagamentos com M-Pesa e e-Mola · Vídeos alojados no YouTube</span>
      </div>
    </footer>
  );
}
