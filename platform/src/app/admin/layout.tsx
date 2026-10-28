import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace";
import { requireRolePage } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { adminOverview } from "@/server/analytics/service";

export const metadata: Metadata = { title: { default: "Gestão", template: "%s · Gestão Kuvona" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage(["admin"], "/admin");
  const o = await adminOverview(await getDb());
  return (
    <WorkspaceShell
      user={user}
      role="Gestão da academia"
      nav={[
        { href: "/admin", label: "Visão geral", icon: "chart", exact: true },
        { href: "/admin/pagamentos", label: "Pagamentos", icon: "wallet", count: o.awaitingCount },
        { href: "/admin/cursos", label: "Cursos", icon: "book", count: o.inReview },
        { href: "/admin/utilizadores", label: "Utilizadores", icon: "users" },
        { href: "/admin/candidaturas", label: "Candidaturas", icon: "sparkle", count: o.applications },
        { href: "/admin/avaliacoes", label: "Avaliações", icon: "star" },
        { href: "/admin/emails", label: "Emails", icon: "mail" },
        { href: "/admin/auditoria", label: "Auditoria", icon: "shield" },
        { href: "/admin/definicoes", label: "Definições", icon: "settings" },
        { href: "/instrutor", label: "Área do instrutor", icon: "layout" },
      ]}
    >
      {children}
    </WorkspaceShell>
  );
}
