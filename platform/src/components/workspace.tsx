import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { formatShortDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { SessionUser } from "@/server/auth/service";
import { Logo } from "./cover";
import { Icon, type IconName } from "./icon";
import { Avatar } from "./ui";
import { WorkspaceNav } from "./workspace-nav";

export type NavItem = { href: string; label: string; icon: IconName; count?: number; exact?: boolean };

export function WorkspaceShell({ user, role, nav, children }: { user: SessionUser; role: string; nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="ws">
      <aside className="ws-side" aria-label="Navegação da área de trabalho">
        <Link href="/" className="logo-link">
          <Logo tone="paper" size={26} />
        </Link>
        <span className="ws-role">{role}</span>
        <WorkspaceNav items={nav} className="ws-nav" />
        <div className="ws-side-foot ws-nav">
          <Link href="/aprender">
            <Icon name="book" size={18} /> A minha aprendizagem
          </Link>
          <Link href="/">
            <Icon name="home" size={18} /> Ver a loja
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="menu-item" style={{ color: "inherit", padding: "10px 12px" }}>
              <Icon name="logout" size={18} /> Terminar sessão
            </button>
          </form>
          <div className="row" style={{ ["--gap" as string]: "10px", padding: "12px 10px 0" }}>
            <Avatar name={user.name} size={32} />
            <div style={{ minWidth: 0 }}>
              <div className="small" style={{ color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div className="xsmall" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="ws-main">
        <WorkspaceNav items={[...nav, { href: "/", label: "Loja", icon: "home" }]} className="ws-mobile-nav" />
        <main id="conteudo" className="ws-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="ws-header">
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconName;
  tone?: "hero" | "alert";
  href?: string;
}) {
  const body = (
    <>
      <span className="kpi-label">
        {icon && <Icon name={icon} size={16} />} {label}
      </span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </>
  );
  const cls = `kpi${tone ? ` kpi-${tone}` : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Single-series daily bar chart (confirmed revenue). Hover/focus shows each day; a table view is provided. */
export function RevenueChart({ series, currency = "MZN", title = "Receita confirmada por dia" }: { series: { day: string; revenueCents: number; enrollments: number }[]; currency?: string; title?: string }) {
  const max = niceMax(Math.max(...series.map((s) => s.revenueCents), 0));
  const ticks = [max, max / 2, 0];
  const total = series.reduce((s, d) => s + d.revenueCents, 0);
  const label = (cents: number) => (cents >= 100_000 ? `${Math.round(cents / 100_000)}k` : String(Math.round(cents / 100)));
  return (
    <figure className="chart" style={{ margin: 0 }} aria-label={`${title}: total ${formatMoney(total, currency)}`}>
      <div className="chart-plot">
        <div className="chart-y" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ top: `${100 - (t / max) * 100}%` }}>
              {label(t)}
            </span>
          ))}
        </div>
        <div className="chart-area">
          {ticks.slice(0, -1).map((t) => (
            <div key={t} className="chart-grid" style={{ top: `${100 - (t / max) * 100}%` }} aria-hidden="true" />
          ))}
          <div className="chart-bars">
            {series.map((d) => {
              const pct = (d.revenueCents / max) * 100;
              return (
                <div key={d.day} className={`chart-bar${d.revenueCents === 0 ? " zero" : ""}`} tabIndex={0} aria-label={`${formatShortDate(d.day)}: ${formatMoney(d.revenueCents, currency)}, ${d.enrollments} inscrições`}>
                  <i style={{ height: `${pct}%` }} />
                  <span className="chart-tip" style={{ bottom: `calc(${pct}% + 8px)` }}>
                    <strong>{formatMoney(d.revenueCents, currency)}</strong> · {formatShortDate(d.day)}
                    <br />
                    {d.enrollments} {d.enrollments === 1 ? "inscrição" : "inscrições"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="chart-x" aria-hidden="true">
        <span />
        <div>
          <span>{series[0] && formatShortDate(series[0].day)}</span>
          <span>{series.at(-1) && formatShortDate(series.at(-1)!.day)}</span>
        </div>
      </div>
      <details>
        <summary className="xsmall muted" style={{ cursor: "pointer" }}>
          Ver como tabela
        </summary>
        <div className="table-wrap" style={{ marginTop: 8, maxHeight: 240, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="num">Receita</th>
                <th className="num">Inscrições</th>
              </tr>
            </thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.day}>
                  <td>{formatShortDate(d.day)}</td>
                  <td className="num">{formatMoney(d.revenueCents, currency)}</td>
                  <td className="num">{d.enrollments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
