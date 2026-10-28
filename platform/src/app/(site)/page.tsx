import Link from "next/link";
import { getSetting } from "@/server/settings";
import { CourseCard } from "@/components/course-card";
import { CourseCover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { PartnerStrip } from "@/components/partners";
import { Price, SectionHeading } from "@/components/ui";
import { getDb } from "@/server/db/client";
import {
  listCategories,
  listCourseCards,
  platformStats,
} from "@/server/catalog/queries";
import { plural } from "@/lib/text";

const tileColors = [
  "#E0512B",
  "#0E5E57",
  "#F2A83B",
  "#2A3278",
  "#4F7F2F",
  "#8A2E1A",
  "#16130E",
];

export default async function HomePage() {
  const db = await getDb();
  const [featured, popular, free, cats, stats, content] = await Promise.all([
    listCourseCards(db, { featured: true, limit: 3 }),
    listCourseCards(db, { limit: 8 }),
    listCourseCards(db, { limit: 12 }).then((all) =>
      all.filter((c) => c.priceCents === 0).slice(0, 4),
    ),
    listCategories(db),
    platformStats(db),
    getSetting(db, "content"),
  ]);
  const heroCards = (featured.length >= 3 ? featured : popular).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow rise">Academia digital · Moçambique</span>
            <h1 className="display-1 hero-title">
              {content.heroTitle.split("\n").map((line, index, lines) => (
                <span
                  className="line rise"
                  key={index}
                  style={{ ["--i" as string]: index + 1 }}
                >
                  {index === lines.length - 1 ? (
                    <em className="accent">{line}</em>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>
            <p
              className="lead rise"
              style={{ ["--i" as string]: 3, marginTop: 22, maxWidth: "46ch" }}
            >
              {content.heroSubtitle}
            </p>
            <form
              action="/cursos"
              className="hero-search rise"
              style={{ ["--i" as string]: 4 }}
              role="search"
            >
              <input
                type="search"
                name="q"
                placeholder="Excel, marketing, programação…"
                aria-label="Pesquisar cursos"
              />
              <button className="btn btn-accent" type="submit">
                <Icon name="search" size={18} /> Procurar
              </button>
            </form>
            <div className="hero-chips rise" style={{ ["--i" as string]: 5 }}>
              {cats.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/cursos?categoria=${c.slug}`}
                  className="chip"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hero-art" aria-label="Cursos em destaque">
            <div className="hero-sun" aria-hidden="true" />
            {heroCards.map((c) => (
              <Link key={c.id} href={`/cursos/${c.slug}`} className="hero-card">
                <CourseCover
                  seed={c.coverSeed}
                  title={c.title}
                  rounded={false}
                />
                <div className="hero-card-body spread">
                  <strong
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      lineHeight: 1.15,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {c.title}
                  </strong>
                  <Price
                    cents={c.priceCents}
                    currency={c.currency}
                    className="small"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="facts" aria-label="A Kuvona em números">
        <div className="container facts-grid">
          <div className="fact">
            <span className="fact-icon">
              <Icon name="book" />
            </span>
            <div>
              <strong>{plural(stats.courses, "curso", "cursos")}</strong>
              <span>
                {plural(stats.lessons, "aula publicada", "aulas publicadas")}
              </span>
            </div>
          </div>
          <div className="fact">
            <span className="fact-icon">
              <Icon name="phone" />
            </span>
            <div>
              <strong>M-Pesa e e-Mola</strong>
              <span>Pagamento confirmado pela equipa</span>
            </div>
          </div>
          <div className="fact">
            <span className="fact-icon">
              <Icon name="award" />
            </span>
            <div>
              <strong>Certificados</strong>
              <span>Com código verificável</span>
            </div>
          </div>
          <div className="fact">
            <span className="fact-icon">
              <Icon name="sparkle" />
            </span>
            <div>
              <strong>
                {plural(stats.freeCourses, "curso grátis", "cursos grátis")}
              </strong>
              <span>Para começares hoje</span>
            </div>
          </div>
        </div>
      </section>

      <PartnerStrip />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Mais procurados"
            title={
              <>
                Cursos para <em className="accent">começar já</em>
              </>
            }
            action={
              <Link href="/cursos" className="btn btn-outline">
                Ver todos os cursos <Icon name="arrowRight" size={18} />
              </Link>
            }
          >
            Cada curso tem uma aula de pré-visualização gratuita, para decidires
            com calma.
          </SectionHeading>
          <div className="rail">
            {popular.slice(0, 8).map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHeading eyebrow="Explorar" title="Escolhe uma área" />
          <div className="category-grid">
            {cats.map((c, i) => (
              <Link
                key={c.id}
                href={`/cursos?categoria=${c.slug}`}
                className="category-tile"
              >
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <span className="count">
                  {plural(c.courseCount, "curso", "cursos")}{" "}
                  <Icon name="arrowRight" size={15} />
                </span>
                <span
                  className="glyph"
                  style={{ background: tileColors[i % tileColors.length] }}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHeading
            eyebrow="Como funciona"
            title={
              <>
                Do primeiro clique ao <em className="accent">certificado</em>
              </>
            }
          />
          <ol
            className="steps"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            <li className="step">
              <span className="step-n">1</span>
              <h3>Escolhe o curso</h3>
              <p>
                Vê o programa completo, o instrutor e uma aula gratuita antes de
                decidir.
              </p>
            </li>
            <li className="step">
              <span className="step-n">2</span>
              <h3>Paga no telemóvel</h3>
              <p>
                Envia por M-Pesa ou e-Mola e indica o ID da transação. A equipa
                confirma no extrato.
              </p>
            </li>
            <li className="step">
              <span className="step-n">3</span>
              <h3>Aprende ao teu ritmo</h3>
              <p>
                Aulas curtas, notas, materiais e perguntas ao instrutor. O
                progresso fica guardado.
              </p>
            </li>
            <li className="step">
              <span className="step-n">4</span>
              <h3>Recebe o certificado</h3>
              <p>
                Conclui as aulas e a avaliação final. Partilha o código:
                qualquer pessoa o pode verificar.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {free.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <SectionHeading
              eyebrow="Sem custos"
              title="Cursos gratuitos"
              action={
                <Link href="/cursos?preco=gratis" className="link">
                  Ver todos os gratuitos
                </Link>
              }
            />
            <div className="course-grid">
              {free.map((c, i) => (
                <CourseCard key={c.id} course={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="teach-band">
            <div
              className="stack"
              style={{
                ["--gap" as string]: "18px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <span className="eyebrow">Para instrutores</span>
              <h2 className="display-2" style={{ color: "#fffdf8" }}>
                Partilha o que sabes.{" "}
                <em className="accent" style={{ color: "var(--saffron)" }}>
                  Ensina na Kuvona.
                </em>
              </h2>
              <p className="lead">
                Cria cursos com vídeos do YouTube, acompanha o progresso dos
                teus estudantes e vê as tuas vendas num só lugar.
              </p>
              <div className="row">
                <Link
                  href="/ensinar"
                  className="btn btn-lg"
                  style={{
                    ["--btn-bg" as string]: "var(--paper)",
                    ["--btn-fg" as string]: "var(--ink)",
                  }}
                >
                  Candidatar-me <Icon name="arrowRight" size={18} />
                </Link>
              </div>
            </div>
            <div className="teach-band-art" aria-hidden="true">
              <CourseCover
                seed={424242}
                title=""
                rounded={false}
                className=""
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-narrow">
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title="Antes de começares"
          />
          <div className="faq">
            {content.homeFaq.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="plus" aria-hidden="true">
                    <Icon name="plus" size={16} />
                  </span>
                </summary>
                <p className="answer">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
