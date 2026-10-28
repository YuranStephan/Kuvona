import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollFreeAction, reviewAction, toggleWishlistAction } from "@/actions/commerce";
import { CourseCard } from "@/components/course-card";
import { CourseCover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Avatar, CourseStatusBadge, Notice, Price, Progress, Stars } from "@/components/ui";
import { formatDate, formatDuration, levelLabel } from "@/lib/format";
import { plural } from "@/lib/text";
import { youTubeThumbnail } from "@/lib/youtube";
import { getCurrentUser } from "@/server/auth/session";
import { getCourseDetail, listCourseCards } from "@/server/catalog/queries";
import { getDb } from "@/server/db/client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCourseDetail(await getDb(), slug, null);
  return detail ? { title: detail.course.title, description: detail.course.subtitle || detail.course.description.slice(0, 160) } : { title: "Curso" };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const db = await getDb();
  const detail = await getCourseDetail(db, slug, user);
  if (!detail) notFound();
  const { course, instructor, instructorStats, category, outline, stats, reviews, distribution, viewer } = detail;
  const firstPreview = outline.flatMap((m) => m.lessons).find((l) => l.isPreview);
  const related = await listCourseCards(db, { categorySlug: category?.slug, excludeId: course.id, limit: 4 });
  const isFree = course.priceCents === 0;
  const canReview = viewer.access === "enrolled" && viewer.completedLessons > 0;
  const loginNext = `/entrar?next=${encodeURIComponent(`/cursos/${course.slug}`)}`;

  return (
    <>
      <section className="course-hero">
        <div className="container course-hero-inner">
          <div>
            <nav className="breadcrumbs" aria-label="Navegação estrutural">
              <Link href="/cursos">Cursos</Link>
              {category && (
                <>
                  <Icon name="chevronRight" size={14} />
                  <Link href={`/cursos?categoria=${category.slug}`}>{category.name}</Link>
                </>
              )}
            </nav>
            {course.status !== "published" && (
              <div style={{ marginTop: 16 }}>
                <CourseStatusBadge status={course.status} /> <span className="small">Pré-visualização interna: só tu e a gestão veem esta página.</span>
              </div>
            )}
            <h1>{course.title}</h1>
            {course.subtitle && <p className="lead">{course.subtitle}</p>}
            <div className="hero-meta">
              {stats.ratingAvg !== null && stats.ratingCount > 0 && (
                <span>
                  <strong style={{ color: "var(--saffron)" }}>{stats.ratingAvg.toLocaleString("pt-PT")}</strong>
                  <Stars value={stats.ratingAvg} size={14} /> ({plural(stats.ratingCount, "avaliação", "avaliações")})
                </span>
              )}
              {stats.studentCount > 0 && (
                <span>
                  <Icon name="users" size={16} /> {plural(stats.studentCount, "estudante", "estudantes")}
                </span>
              )}
              <span>
                <Icon name="signal" size={16} /> {levelLabel[course.level]}
              </span>
              <span>
                <Icon name="globe" size={16} /> Português
              </span>
              <span>
                <Icon name="calendar" size={16} /> Atualizado em {formatDate(course.updatedAt)}
              </span>
            </div>
            <p style={{ marginTop: 22 }}>
              Criado por{" "}
              <Link href={`/instrutores/${instructor.id}`} style={{ color: "var(--saffron)", fontWeight: 650 }}>
                {instructor.name}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <div className="container course-body">
        <div>
          {course.outcomes.length > 0 && (
            <section className="content-section">
              <h2>O que vais aprender</h2>
              <div className="outcomes">
                <ul>
                  {course.outcomes.map((o) => (
                    <li key={o}>
                      <Icon name="check" size={18} />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              {course.skills.length > 0 && (
                <div className="row" style={{ marginTop: 18, ["--gap" as string]: "8px" }}>
                  <span className="small muted">Competências:</span>
                  {course.skills.map((s) => (
                    <Link key={s} href={`/cursos?q=${encodeURIComponent(s)}`} className="chip" style={{ padding: "5px 12px", fontSize: 13.5 }}>
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="content-section" id="programa">
            <div className="spread" style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 0 }}>Programa do curso</h2>
              <span className="small muted">
                {plural(outline.length, "módulo", "módulos")} · {plural(stats.lessonCount, "aula", "aulas")}
                {stats.durationSeconds > 0 && ` · ${formatDuration(stats.durationSeconds)}`}
              </span>
            </div>
            <div className="curriculum">
              {outline.map((m, mi) => (
                <details key={m.id} open={mi === 0}>
                  <summary>
                    <span>
                      <span className="muted" style={{ fontWeight: 500, marginRight: 8 }}>
                        {String(mi + 1).padStart(2, "0")}
                      </span>
                      {m.title}
                    </span>
                    <span className="row small muted" style={{ ["--gap" as string]: "10px", fontWeight: 500 }}>
                      {plural(m.lessons.length, "aula", "aulas")}
                      <Icon name="chevronDown" size={18} className="chev" />
                    </span>
                  </summary>
                  <ol>
                    {m.lessons.map((l) => (
                      <li key={l.id} className="lesson-row">
                        <Icon name={l.hasVideo ? "playCircle" : "text"} size={18} />
                        <span className="t">
                          {l.isPreview ? (
                            <Link href={`/cursos/${course.slug}/previa/${l.id}`} className="link">
                              {l.title}
                            </Link>
                          ) : (
                            l.title
                          )}
                        </span>
                        {l.isPreview && <span className="badge badge-teal">Pré-visualização</span>}
                        {!l.isPreview && viewer.access === null && <Icon name="lock" size={15} />}
                        {l.durationSeconds > 0 && <span className="small muted tabular">{formatDuration(l.durationSeconds)}</span>}
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {course.description && (
            <section className="content-section">
              <h2>Sobre este curso</h2>
              <div className="prose">
                {course.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {(course.requirements.length > 0 || course.audience.length > 0) && (
            <section className="content-section grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {course.requirements.length > 0 && (
                <div>
                  <h2 className="h3" style={{ marginBottom: 14 }}>
                    Requisitos
                  </h2>
                  <ul className="prose" style={{ fontSize: 16 }}>
                    {course.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {course.audience.length > 0 && (
                <div>
                  <h2 className="h3" style={{ marginBottom: 14 }}>
                    Para quem é
                  </h2>
                  <ul className="prose" style={{ fontSize: 16 }}>
                    {course.audience.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {course.project && (
            <section className="content-section">
              <div className="card card-pad" style={{ background: "var(--saffron-soft)", borderColor: "transparent" }}>
                <span className="eyebrow">Projeto final</span>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.3, marginTop: 10 }}>{course.project}</p>
              </div>
            </section>
          )}

          <section className="content-section">
            <h2>O teu instrutor</h2>
            <div className="instructor-card">
              <Avatar name={instructor.name} size={76} />
              <div className="stack" style={{ ["--gap" as string]: "6px" }}>
                <Link href={`/instrutores/${instructor.id}`} className="h3" style={{ textDecoration: "none", fontFamily: "var(--font-display)" }}>
                  {instructor.name}
                </Link>
                {instructor.headline && <span className="muted">{instructor.headline}</span>}
                <div className="instructor-stats">
                  <span>
                    <Icon name="book" size={15} /> {plural(instructorStats.courses, "curso", "cursos")}
                  </span>
                  {instructorStats.students > 0 && (
                    <span>
                      <Icon name="users" size={15} /> {plural(instructorStats.students, "estudante", "estudantes")}
                    </span>
                  )}
                  {instructorStats.rating !== null && (
                    <span>
                      <Icon name="star" size={15} /> {instructorStats.rating.toLocaleString("pt-PT")} ({instructorStats.reviews})
                    </span>
                  )}
                </div>
                {instructor.bio && <p style={{ marginTop: 8, color: "var(--ink-3)" }}>{instructor.bio}</p>}
              </div>
            </div>
          </section>

          <section className="content-section" id="avaliacoes">
            <h2>Avaliações dos estudantes</h2>
            {stats.ratingCount > 0 && stats.ratingAvg !== null ? (
              <div className="rating-summary">
                <div style={{ textAlign: "center" }}>
                  <div className="rating-big">{stats.ratingAvg.toLocaleString("pt-PT")}</div>
                  <Stars value={stats.ratingAvg} />
                  <div className="small muted">{plural(stats.ratingCount, "avaliação", "avaliações")}</div>
                </div>
                <div className="stack" style={{ ["--gap" as string]: "6px" }}>
                  {distribution.map((d) => (
                    <div key={d.stars} className="dist-row">
                      <span>{d.stars} ★</span>
                      <Progress value={stats.ratingCount ? (d.count / stats.ratingCount) * 100 : 0} thin label={`${d.stars} estrelas`} />
                      <span className="muted tabular">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">Ainda não há avaliações. Só estudantes inscritos que concluíram aulas podem avaliar — sem números inventados.</p>
            )}
            {canReview && (
              <div className="card card-pad" style={{ marginTop: 20 }}>
                <ActionForm action={reviewAction.bind(null, course.id)} className="stack">
                  <h3 className="h3">{viewer.myReview ? "Atualizar a tua avaliação" : "Avalia este curso"}</h3>
                  <fieldset className="star-input" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="sr-only">Classificação</legend>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <span key={n} style={{ display: "contents" }}>
                        <input type="radio" id={`star-${n}`} name="rating" value={n} defaultChecked={viewer.myReview?.rating === n} required />
                        <label htmlFor={`star-${n}`} aria-label={`${n} estrelas`}>
                          <Icon name="star" size={30} fill="currentColor" />
                        </label>
                      </span>
                    ))}
                  </fieldset>
                  <textarea name="body" className="textarea" placeholder="O que achaste? O que mais te ajudou?" defaultValue={viewer.myReview?.body ?? ""} maxLength={2000} />
                  <div>
                    <SubmitButton pendingLabel="A publicar…">Publicar avaliação</SubmitButton>
                  </div>
                </ActionForm>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              {reviews.map((r) => (
                <article key={r.id} className="review">
                  <Avatar name={r.userName} size={42} />
                  <div className="stack" style={{ ["--gap" as string]: "6px" }}>
                    <div className="row" style={{ ["--gap" as string]: "10px" }}>
                      <strong>{r.userName}</strong>
                      <Stars value={r.rating} size={13} />
                      <span className="small faint">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.body && <p style={{ color: "var(--ink-3)" }}>{r.body}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {course.faq.length > 0 && (
            <section className="content-section">
              <h2>Perguntas frequentes</h2>
              <div className="faq">
                {course.faq.map((f) => (
                  <details key={f.q}>
                    <summary>
                      {f.q}
                      <span className="plus" aria-hidden="true">
                        <Icon name="plus" size={16} />
                      </span>
                    </summary>
                    <p className="answer">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="buy-card">
            <div className="buy-card-media">
              {course.trailerYoutubeId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={youTubeThumbnail(course.trailerYoutubeId)} alt="" />
              ) : (
                <CourseCover seed={course.coverSeed} title={course.title} rounded={false} />
              )}
              {firstPreview && (
                <Link href={`/cursos/${course.slug}/previa/${firstPreview.id}`} className="play-preview">
                  <span className="play-dot">
                    <Icon name="play" size={26} fill="currentColor" />
                  </span>
                  <span className="play-label">Ver aula gratuita</span>
                </Link>
              )}
            </div>
            <div className="buy-card-body">
              {viewer.access === "enrolled" ? (
                <>
                  <Notice tone="success">Já estás inscrito neste curso.</Notice>
                  <Link href={`/aprender/${course.slug}`} className="btn btn-lg btn-block btn-teal">
                    Continuar a aprender <Icon name="arrowRight" size={18} />
                  </Link>
                </>
              ) : viewer.access === "owner" || viewer.access === "admin" ? (
                <>
                  <Price cents={course.priceCents} currency={course.currency} />
                  <Link href={`/aprender/${course.slug}`} className="btn btn-lg btn-block">
                    Abrir a sala de aula <Icon name="arrowRight" size={18} />
                  </Link>
                  <p className="xsmall muted">Tens acesso como {viewer.access === "owner" ? "instrutor deste curso" : "gestão"}; não conta como inscrição.</p>
                </>
              ) : isFree ? (
                <>
                  <Price cents={0} currency={course.currency} />
                  {user ? (
                    <ActionForm action={enrollFreeAction.bind(null, course.id, course.slug)}>
                      <SubmitButton className="btn btn-lg btn-block btn-accent" pendingLabel="A inscrever…">
                        Inscrever-me grátis
                      </SubmitButton>
                    </ActionForm>
                  ) : (
                    <Link href={loginNext} className="btn btn-lg btn-block btn-accent">
                      Entrar para me inscrever
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Price cents={course.priceCents} currency={course.currency} />
                  {viewer.openOrderReference ? (
                    <Link href={`/pedidos/${viewer.openOrderReference}`} className="btn btn-lg btn-block btn-accent">
                      Continuar o pagamento <Icon name="arrowRight" size={18} />
                    </Link>
                  ) : (
                    <Link href={`/checkout/${course.slug}`} className="btn btn-lg btn-block btn-accent">
                      Comprar curso <Icon name="arrowRight" size={18} />
                    </Link>
                  )}
                  <p className="xsmall muted" style={{ textAlign: "center" }}>
                    Pagamento por M-Pesa ou e-Mola · <Link href="/reembolsos" className="link-quiet">Política de reembolso</Link>
                  </p>
                </>
              )}
              <hr className="divider" />
              <strong className="small">Este curso inclui</strong>
              <ul className="includes">
                <li>
                  <Icon name="layers" size={18} /> {plural(stats.lessonCount, "aula", "aulas")} em {plural(outline.length, "módulo", "módulos")}
                </li>
                {stats.videoCount > 0 && (
                  <li>
                    <Icon name="video" size={18} /> {plural(stats.videoCount, "vídeo", "vídeos")}
                    {stats.durationSeconds > 0 && ` · ${formatDuration(stats.durationSeconds)}`}
                  </li>
                )}
                <li>
                  <Icon name="file" size={18} /> Exercícios práticos e notas
                </li>
                <li>
                  <Icon name="message" size={18} /> Perguntas ao instrutor
                </li>
                <li>
                  <Icon name="award" size={18} /> Certificado verificável
                </li>
                <li>
                  <Icon name="phone" size={18} /> Acesso no telemóvel e no computador
                </li>
              </ul>
              {user && viewer.access !== "enrolled" && (
                <form action={toggleWishlistAction.bind(null, course.id)}>
                  <button className="btn btn-ghost btn-block btn-sm" type="submit">
                    <Icon name="heart" size={17} fill={viewer.wishlisted ? "var(--vermilion)" : "none"} color={viewer.wishlisted ? "var(--vermilion)" : undefined} />
                    {viewer.wishlisted ? "Na lista de desejos" : "Guardar na lista de desejos"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="container">
            <h2 className="h2" style={{ marginBottom: 24 }}>
              Também te pode interessar
            </h2>
            <div className="course-grid">
              {related.map((c, i) => (
                <CourseCard key={c.id} course={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
