import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace";
import { requireRolePage } from "@/server/auth/session";
import { instructorTotals } from "@/server/analytics/service";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = { title: { default: "Área do instrutor", template: "%s · Instrutor Kuvona" }, robots: { index: false } };

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage(["instructor", "admin"], "/instrutor");
  const totals = await instructorTotals(await getDb(), user.id);
  return (
    <WorkspaceShell
      user={user}
      role="Área do instrutor"
      nav={[
        { href: "/instrutor", label: "Painel", icon: "chart", exact: true },
        { href: "/instrutor/cursos", label: "Os meus cursos", icon: "book" },
        { href: "/instrutor/perguntas", label: "Perguntas", icon: "message", count: totals.openQuestions },
        ...(user.role === "admin" ? [{ href: "/admin", label: "Gestão", icon: "shield" as const }] : []),
      ]}
    >
      {children}
    </WorkspaceShell>
  );
}
