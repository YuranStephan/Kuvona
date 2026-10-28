import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/workspace";
import { Avatar, EmptyState } from "@/components/ui";
import { formatDate, formatRelative, roleLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { listUsers } from "@/server/analytics/service";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; papel?: string }> }) {
  const sp = await searchParams;
  const rows = await listUsers(await getDb(), { q: sp.q, role: sp.papel });
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Utilizadores">
        Estudantes, instrutores e equipa de gestão. Abre uma conta para mudar o papel, desativar ou conceder acesso a um curso.
      </PageHeader>
      <div className="spread">
        <nav className="filter-tabs">
          {[
            ["", "Todos"],
            ["student", "Estudantes"],
            ["instructor", "Instrutores"],
            ["admin", "Gestão"],
          ].map(([k, label]) => (
            <Link key={k} href={`/admin/utilizadores${k ? `?papel=${k}` : ""}`} className={`chip${(sp.papel ?? "") === k ? " is-active" : ""}`}>
              {label}
            </Link>
          ))}
        </nav>
        <form role="search" style={{ maxWidth: 320, flex: 1 }}>
          {sp.papel && <input type="hidden" name="papel" value={sp.papel} />}
          <input className="input" name="q" defaultValue={sp.q} placeholder="Nome ou email" aria-label="Pesquisar utilizadores" />
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="users" title="Nenhum utilizador encontrado" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Registo</th>
                <th>Última atividade</th>
                <th className="num">Cursos</th>
                <th className="num">Gasto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/utilizadores/${u.id}`} className="row" style={{ ["--gap" as string]: "10px", textDecoration: "none", flexWrap: "nowrap" }}>
                      <Avatar name={u.name} size={34} />
                      <span className="stack" style={{ ["--gap" as string]: "0" }}>
                        <strong>{u.name}</strong>
                        <span className="xsmall muted">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-ink" : u.role === "instructor" ? "badge-teal" : ""}`}>{roleLabel[u.role]}</span>
                    {u.disabledAt && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Desativada</span>}
                    {!u.emailVerifiedAt && <span className="badge" style={{ marginLeft: 6 }}>Email por confirmar</span>}
                  </td>
                  <td className="nowrap">{formatDate(u.createdAt)}</td>
                  <td className="nowrap">{u.lastActivityAt ? formatRelative(u.lastActivityAt) : "—"}</td>
                  <td className="num">{u.enrollments}</td>
                  <td className="num">{formatMoney(u.spentCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
