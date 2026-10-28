import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { Icon } from "@/components/icon";
import { EmptyState } from "@/components/ui";
import { levelLabel } from "@/lib/format";
import { plural } from "@/lib/text";
import { getDb } from "@/server/db/client";
import { listCatalog, listCategories, type CatalogFilters, type CatalogSort } from "@/server/catalog/queries";
import type { CourseLevel } from "@/server/db/schema";

export const metadata: Metadata = { title: "Cursos", description: "Explora todos os cursos da Academia Kuvona." };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const priceMap = { gratis: "free", pago: "paid" } as const;
const durationMap = { curta: "short", media: "medium", longa: "long" } as const;
const sortMap: Record<string, CatalogSort> = {
  relevancia: "relevance",
  recentes: "newest",
  "preco-asc": "price_asc",
  "preco-desc": "price_desc",
  avaliacao: "rating",
  populares: "popular",
};
const levels: CourseLevel[] = ["beginner", "intermediate", "advanced", "all"];

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const params = {
    q: one(sp.q).slice(0, 80),
    categoria: one(sp.categoria),
    nivel: one(sp.nivel),
    preco: one(sp.preco),
    duracao: one(sp.duracao),
    ordem: one(sp.ordem),
    pagina: one(sp.pagina),
    vista: one(sp.vista),
  };
  const filters: CatalogFilters = {
    q: params.q || undefined,
    category: params.categoria || undefined,
    level: levels.includes(params.nivel as CourseLevel) ? (params.nivel as CourseLevel) : undefined,
    price: priceMap[params.preco as keyof typeof priceMap],
    duration: durationMap[params.duracao as keyof typeof durationMap],
    sort: sortMap[params.ordem],
    page: Number(params.pagina) || 1,
  };
  const db = await getDb();
  const [result, categories] = await Promise.all([listCatalog(db, filters), listCategories(db)]);
  const view = params.vista === "lista" ? "list" : "grid";

  const href = (changes: Partial<typeof params>) => {
    const next = { ...params, pagina: "", ...changes };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    const s = qs.toString();
    return s ? `/cursos?${s}` : "/cursos";
  };
  const activeCategory = categories.find((c) => c.slug === params.categoria);
  const hasFilters = Boolean(params.q || params.categoria || params.nivel || params.preco || params.duracao);

  const FilterPanel = (
    <div className="filters">
      <div className="filter-group">
        <h3>Área</h3>
        <div className="filter-options">
          <Link href={href({ categoria: "" })} className="filter-option" aria-current={!params.categoria}>
            Todas
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={href({ categoria: c.slug })} className="filter-option" aria-current={params.categoria === c.slug}>
              {c.name} <span className="n">{c.courseCount}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>Preço</h3>
        <div className="filter-options">
          {[
            ["", "Todos"],
            ["gratis", "Gratuitos"],
            ["pago", "Pagos"],
          ].map(([v, label]) => (
            <Link key={v} href={href({ preco: v })} className="filter-option" aria-current={params.preco === v}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>Nível</h3>
        <div className="filter-options">
          <Link href={href({ nivel: "" })} className="filter-option" aria-current={!params.nivel}>
            Todos
          </Link>
          {levels.map((l) => (
            <Link key={l} href={href({ nivel: l })} className="filter-option" aria-current={params.nivel === l}>
              {levelLabel[l]}
            </Link>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>Duração</h3>
        <div className="filter-options">
          {[
            ["", "Qualquer"],
            ["curta", "Menos de 1 hora"],
            ["media", "1 a 4 horas"],
            ["longa", "Mais de 4 horas"],
          ].map(([v, label]) => (
            <Link key={v} href={href({ duracao: v })} className="filter-option" aria-current={params.duracao === v}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <section className="page-hero">
        <div className="container stack" style={{ ["--gap" as string]: "14px" }}>
          <span className="eyebrow">Catálogo</span>
          <h1 className="display-2">
            {params.q ? (
              <>
                Resultados para <em className="accent">“{params.q}”</em>
              </>
            ) : activeCategory ? (
              activeCategory.name
            ) : (
              <>
                Todos os <em className="accent">cursos</em>
              </>
            )}
          </h1>
          {activeCategory?.description && !params.q && <p className="lead">{activeCategory.description}</p>}
          <form action="/cursos" className="header-search" style={{ display: "block", maxWidth: 560, marginTop: 8 }} role="search">
            <Icon name="search" size={18} />
            <input className="input" type="search" name="q" defaultValue={params.q} placeholder="Pesquisar por tema, competência ou instrutor" aria-label="Pesquisar cursos" />
            {params.categoria && <input type="hidden" name="categoria" value={params.categoria} />}
          </form>
        </div>
      </section>

      <div className="container catalog-layout">
        <aside aria-label="Filtros">{FilterPanel}</aside>
        <section>
          <details className="filters-mobile">
            <summary className="btn btn-outline btn-sm">
              <Icon name="settings" size={16} /> Filtros
            </summary>
            {FilterPanel}
          </details>
          <div className="catalog-toolbar">
            <p className="muted">
              <strong style={{ color: "var(--ink)" }}>{plural(result.total, "curso", "cursos")}</strong>
              {hasFilters && (
                <>
                  {" · "}
                  <Link href="/cursos" className="link">
                    Limpar filtros
                  </Link>
                </>
              )}
            </p>
            <div className="row" style={{ ["--gap" as string]: "8px" }}>
              <form action="/cursos" className="row" style={{ ["--gap" as string]: "8px" }}>
                {Object.entries(params)
                  .filter(([k, v]) => v && k !== "ordem" && k !== "pagina")
                  .map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                <label className="sr-only" htmlFor="ordem">
                  Ordenar
                </label>
                <select id="ordem" name="ordem" className="select" defaultValue={params.ordem || ""} style={{ minHeight: 40, width: "auto" }}>
                  <option value="">Mais populares</option>
                  {params.q && <option value="relevancia">Mais relevantes</option>}
                  <option value="recentes">Mais recentes</option>
                  <option value="avaliacao">Melhor avaliados</option>
                  <option value="preco-asc">Preço: mais baixo</option>
                  <option value="preco-desc">Preço: mais alto</option>
                </select>
                <button className="btn btn-soft btn-sm" type="submit">
                  Ordenar
                </button>
              </form>
              <Link href={href({ vista: "" })} className={`btn btn-icon btn-sm ${view === "grid" ? "" : "btn-ghost"}`} aria-label="Ver em grelha" aria-pressed={view === "grid"}>
                <Icon name="grid" size={17} />
              </Link>
              <Link href={href({ vista: "lista" })} className={`btn btn-icon btn-sm ${view === "list" ? "" : "btn-ghost"}`} aria-label="Ver em lista" aria-pressed={view === "list"}>
                <Icon name="text" size={17} />
              </Link>
            </div>
          </div>

          {result.items.length ? (
            <div className={view === "grid" ? "course-grid" : "stack"}>
              {result.items.map((c, i) => (
                <CourseCard key={c.id} course={c} layout={view} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="search" title="Nenhum curso encontrado" action={{ href: "/cursos", label: "Ver todos os cursos" }}>
              Experimenta outras palavras ou remove alguns filtros.
            </EmptyState>
          )}

          {result.pages > 1 && (
            <nav className="pagination" aria-label="Paginação">
              {result.page > 1 && (
                <Link href={href({ pagina: String(result.page - 1) })} aria-label="Página anterior">
                  <Icon name="chevronLeft" size={16} />
                </Link>
              )}
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) =>
                n === result.page ? (
                  <span key={n} aria-current="page">
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={href({ pagina: String(n) })}>
                    {n}
                  </Link>
                ),
              )}
              {result.page < result.pages && (
                <Link href={href({ pagina: String(result.page + 1) })} aria-label="Página seguinte">
                  <Icon name="chevronRight" size={16} />
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
