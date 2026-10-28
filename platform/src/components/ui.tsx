import Link from "next/link";
import type { ReactNode } from "react";
import { courseStatusLabel, orderStatusLabel } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { initials } from "@/lib/text";
import type { CourseStatus, OrderStatus } from "@/server/db/schema";
import { Icon, type IconName } from "./icon";

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value.toLocaleString("pt-PT")} de 5 estrelas`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={value >= i - 0.25 ? "" : "off"} aria-hidden="true">
          <path
            d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </span>
  );
}

export function Progress({ value, thin, label }: { value: number; thin?: boolean; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`progress${thin ? " progress-thin" : ""}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progresso"}
      style={{ ["--value" as string]: `${pct}%` }}
    >
      <span />
    </div>
  );
}

export function ProgressRing({ value, size = 44, stroke = 4, tone = "teal" }: { value: number; size?: number; stroke?: number; tone?: "teal" | "paper" }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct)}% concluído`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone === "teal" ? "var(--paper-3)" : "rgb(255 255 255 / 15%)"} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone === "teal" ? "var(--teal)" : "var(--saffron)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s var(--ease)" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.27}
        fontWeight={700}
        fill={tone === "teal" ? "var(--ink)" : "#fff"}
        fontFamily="var(--font-sans)"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

const avatarColors = ["#0E5E57", "#E0512B", "#2A3278", "#8A2E1A", "#4F7F2F", "#16130E", "#B5651D"];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className="avatar" style={{ ["--size" as string]: `${size}px`, background: avatarColors[hash % avatarColors.length] }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Price({ cents, currency, className }: { cents: number; currency: string; className?: string }) {
  return <span className={`price tabular ${className ?? ""}`}>{formatPrice(cents, currency)}</span>;
}

const orderTone: Record<OrderStatus, string> = {
  pending: "badge-warning",
  awaiting_verification: "badge-info",
  paid: "badge-success",
  failed: "badge-danger",
  cancelled: "",
  expired: "",
  refunded: "badge-accent",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-dot ${orderTone[status]}`}>{orderStatusLabel[status]}</span>;
}

const courseTone: Record<CourseStatus, string> = {
  draft: "",
  in_review: "badge-info",
  published: "badge-success",
  archived: "badge-danger",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <span className={`badge badge-dot ${courseTone[status]}`}>{courseStatusLabel[status]}</span>;
}

export function EmptyState({
  icon = "compass",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        <Icon name={icon} size={30} />
      </span>
      <h3 className="h3">{title}</h3>
      {children && <p style={{ maxWidth: 440 }}>{children}</p>}
      {action && (
        <Link href={action.href} className="btn btn-sm" style={{ marginTop: 6 }}>
          {action.label} <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children, icon }: { tone?: "info" | "success" | "warning" | "error"; children: ReactNode; icon?: IconName }) {
  const fallback: Record<string, IconName> = { info: "info", success: "checkCircle", warning: "alert", error: "alert" };
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon ?? fallback[tone]!} size={19} />
      <div>{children}</div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, children, action }: { eyebrow?: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div className="stack" style={{ ["--gap" as string]: "10px" }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="display-2">{title}</h2>
        {children && <p className="lead">{children}</p>}
      </div>
      {action}
    </div>
  );
}
