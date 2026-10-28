import { escapeHTML as e, money, reviewSummary } from "./domain.js";
import { getState, getStorageStatus } from "./store.js";
import {
  icon,
  button,
  link,
  cover,
  date,
  field,
  textarea,
  learnURL,
  empty,
  statusBadge,
  statusText,
} from "./ui.js";

export const marketUI = {
  category: "Todos",
  search: "",
  level: "all",
  price: "all",
  duration: "all",
  sort: "recommended",
  layout: "grid",
  filtersOpen: false,
  page: 1,
  pageSize: 6,
};
export const publicRoutes = [
  "home",
  "catalog",
  "course",
  "instructor",
  "favorites",
  "checkout",
  "purchase",
  "about",
  "teach",
];
export const marketTitles = {
  home: "Conhecimento para o teu próximo passo",
  catalog: "Todos os cursos",
  course: "Sobre o curso",
  instructor: "Conhece quem ensina",
  favorites: "A tua lista de desejos",
  checkout: "Concluir inscrição",
  purchase: "A tua inscrição",
  about: "Sobre a Kuvona",
  teach: "Ensina na Kuvona",
};
const categories = () => [
  ...new Set(getState().catalog.map((c) => c.category)),
];
const categoryIcon = (category) =>
  ({
    Tecnologia: "compass",
    Negócios: "chart",
    Criatividade: "edit",
    Carreira: "users",
    Produtividade: "target",
    Marketing: "message",
  })[category] || "book";
const profileSlug = (name) =>
  name === "Curadoria Kuvona" ? "curadoria" : encodeURIComponent(name);
export function instructorCourses(slug) {
  return getState().catalog.filter((c) => profileSlug(c.instructor) === slug);
}
export function rating(c) {
  const summary = reviewSummary(getState(), c.id);
  return summary.count
    ? `<span class="course-rating"><b>${summary.average.toFixed(1).replace(".", ",")}</b><span aria-label="${summary.average.toFixed(1)} de 5 estrelas">${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</span><small>(${summary.count} ${summary.count === 1 ? "avaliação local" : "avaliações locais"})</small></span>`
    : '<span class="unrated">Novo na Kuvona · ainda sem avaliações</span>';
}

export function marketCard(c) {
  const enrolled = getState().enrollments.includes(c.id);
  return `<article class="course-card market-card" data-action="market-open" data-id="${c.id}"><div class="market-card-media">${cover(c)}<a class="cover-link" href="#course/${c.id}" aria-label="Ver detalhes de ${e(c.title)}"></a></div><div class="market-card-body"><span class="eyebrow">${e(c.category)}</span><h3><a href="#course/${c.id}">${e(c.title)}</a></h3><p>${e(c.subtitle)}</p><a class="market-author" href="#instructor/${profileSlug(c.instructor)}">${e(c.instructor)}</a>${rating(c)}<div class="market-meta"><span>${c.lessons.length} aulas</span><span>${c.minutes} min de estudo</span><span>${e(c.level)}</span></div><div class="market-card-bottom"><strong>${money(c.price)}</strong>${enrolled ? '<span class="badge success">Na tua aprendizagem</span>' : '<span class="badge">' + (c.price ? "Curso completo" : "Acesso gratuito") + "</span>"}</div><a class="market-detail-link" href="#course/${c.id}">Ver detalhes do curso ${icon("arrow")}</a></div></article>`;
}

export function shell(content, page = "home") {
  const s = getState();
  return `<div class="market-shell"><div class="market-announcement"><span>Aprender é um bom começo. <b>O próximo passo é teu.</b></span><a href="#catalog">Explora os cursos ${icon("arrow")}</a></div><header class="market-header"><a class="brand" href="#home" aria-label="Kuvona, página inicial">kuvona<span>✳</span></a><details class="category-menu"><summary>Explorar ${icon("chevron")}</summary><nav aria-label="Áreas de aprendizagem">${categories()
    .map(
      (c) =>
        `<button data-action="market-category" data-value="${e(c)}">${icon(categoryIcon(c))}${e(c)}${icon("chevron")}</button>`,
    )
    .join(
      "",
    )}<a href="#catalog">Ver todos os cursos ${icon("arrow")}</a></nav></details><form class="market-search" data-form="market-search">${icon("search")}<input name="q" aria-label="O que queres aprender?" placeholder="O que queres aprender hoje?" value="${page === "catalog" ? e(marketUI.search) : ""}"><button type="submit" aria-label="Pesquisar">${icon("arrow")}</button></form><a href="#teach" class="header-teach">Ensina na Kuvona</a><a href="#courses" class="my-learning-link">Minha aprendizagem</a><a class="icon-button market-wishlist" href="#favorites" aria-label="Lista de desejos">${icon("heart")}${s.favorites.length ? `<span class="wishlist-count">${s.favorites.length}</span>` : ""}</a><button class="icon-button" data-action="theme" aria-label="Alternar tema">${icon("sun")}</button><a href="#dashboard" class="avatar market-avatar" aria-label="Abrir o meu espaço">${e(s.profile.name.slice(0, 2).toUpperCase())}</a></header><nav class="market-category-bar" aria-label="Categorias">${categories()
    .map(
      (c) =>
        `<button data-action="market-category" data-value="${e(c)}" class="${marketUI.category === c && page === "catalog" ? "active" : ""}">${e(c)}</button>`,
    )
    .join(
      "",
    )}</nav><main id="main" class="market-main" tabindex="-1">${getStorageStatus().ok ? "" : `<div class="market-container"><div class="info-box warning">${e(getStorageStatus().warning)}</div></div>`}${content}</main><section class="market-bottom-cta"><div><span class="eyebrow">O CONHECIMENTO CONTINUA CONTIGO</span><h2>Um novo passo.<br>Um mundo de possibilidades.</h2></div>${link("Encontra o teu próximo curso " + icon("arrow"), "catalog", "lime")}</section><footer class="market-footer"><div class="market-footer-grid"><div><a class="brand" href="#home">kuvona<span>✳</span></a><p>Conhecimento próximo.<br>Possibilidades sem fronteiras.</p><small>Uma academia digital em português.</small></div><div><h3>Aprende</h3><a href="#catalog">Todos os cursos</a><a href="#courses">Minha aprendizagem</a><a href="#favorites">Lista de desejos</a><a href="#certificates">Certificados</a></div><div><h3>Faz parte</h3><a href="#about">Sobre a Kuvona</a><a href="#teach">Ensina na Kuvona</a><a href="#help">Centro de ajuda</a><a href="#admin">Gestão da demonstração</a></div><div><h3>O teu espaço</h3><a href="#settings">Perfil e preferências</a><a href="#payments">As tuas inscrições</a><a href="#planner">Agenda de estudo</a><a href="#settings">Dados e privacidade</a></div></div><div class="market-footer-bottom"><span>© ${new Date().getFullYear()} Kuvona. Aprende. Pratica. Avança.</span><span>Português · Moçambique · MZN</span><span>Demonstração local · sem cobranças reais</span></div></footer></div>`;
}

export function home() {
  const s = getState();
  const featured = s.catalog.slice(0, 4),
    free = s.catalog.filter((c) => c.price === 0).slice(0, 4);
  return `<section class="store-hero market-container"><div class="store-hero-copy"><span class="eyebrow">APRENDE ALGO. MUDA ALGUMA COISA.</span><h1>O teu próximo<br>capítulo começa<br><em>com conhecimento.</em></h1><p>Competências para o trabalho, ideias para o teu negócio e espaço para a tua curiosidade. Aprende em português, ao teu ritmo.</p><form class="hero-search" data-form="market-search">${icon("search")}<input name="q" placeholder="Experimenta “Python” ou “design”" aria-label="Pesquisar um curso"><button class="btn" type="submit">Encontrar cursos ${icon("arrow")}</button></form><div class="hero-topics"><span>Queres começar por onde?</span>${["Tecnologia", "Negócios", "Criatividade"].map((c) => `<button data-action="market-category" data-value="${c}">${c} ↗</button>`).join("")}</div></div><div class="store-hero-art" aria-hidden="true"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="hero-learning-card"><span class="eyebrow">O TEU FUTURO ESTÁ EM CONSTRUÇÃO</span><div class="hero-code">&lt;ideias /&gt;</div><div class="hero-mini-lines"><span></span><span></span><span></span></div><div class="hero-art-footer"><span>Do primeiro passo<br>à próxima possibilidade.</span><b>↗</b></div></div><div class="hero-floating-note"><span>✳</span><div>Um pouco todos os dias.<br><b>Muito mais para o teu futuro.</b></div></div><span class="hero-vertical">APRENDE · PRATICA · AVANÇA</span></div></section><section class="store-values"><div>${icon("book")}<span><b>Aprendizagem que faz sentido</b><small>Objetivos claros e atividades práticas</small></span></div><div>${icon("clock")}<span><b>Um ritmo que é teu</b><small>Estuda quando e onde conseguires</small></span></div><div>${icon("award")}<span><b>Do saber ao fazer</b><small>Aulas, prática e avaliação final</small></span></div></section><section class="market-container market-section"><div class="store-section-heading"><div><span class="eyebrow">EXPLORA O TEU POTENCIAL</span><h2>Há um mundo para aprender.</h2><p>Escolhe a área que te aproxima do teu próximo objetivo.</p></div><a href="#catalog" class="text-link">Todos os cursos ${icon("arrow")}</a></div><div class="category-tiles">${categories()
    .map(
      (c) =>
        `<button data-action="market-category" data-value="${e(c)}"><span>${icon(categoryIcon(c))}</span><b>${e(c)}</b><small>${s.catalog.filter((x) => x.category === c).length} ${s.catalog.filter((x) => x.category === c).length === 1 ? "curso" : "cursos"} ${icon("arrow")}</small></button>`,
    )
    .join(
      "",
    )}</div></section><section class="market-container market-section"><div class="store-section-heading"><div><span class="eyebrow">COMEÇA POR UMA NOVA POSSIBILIDADE</span><h2>Cursos para o teu próximo passo</h2><p>Abre um curso, conhece o programa e decide com tempo.</p></div>${link("Explorar catálogo", "catalog", "secondary")}</div><div class="market-grid">${featured.map(marketCard).join("")}</div></section><section class="practice-banner market-container"><div><span class="eyebrow">NÃO É SÓ VER. É FAZER.</span><h2>Transforma uma aula<br>numa coisa que sabes fazer.</h2><p>Cada percurso tem atividades para experimentares, materiais para levares contigo e uma avaliação para reveres o que aprendeste.</p>${link("Descobre como funciona " + icon("arrow"), "about", "secondary")}</div><div class="practice-steps"><div><span>01</span><b>Escolhe o teu caminho</b><p>Conhece objetivos, requisitos e programa.</p></div><div><span>02</span><b>Aprende e experimenta</b><p>Avança pelas aulas e põe as ideias em prática.</p></div><div><span>03</span><b>Reconhece a tua evolução</b><p>Revê o que aprendeste e conclui o percurso.</p></div></div></section><section class="market-container market-section"><div class="store-section-heading"><div><span class="eyebrow">COMEÇAR PODE SER SIMPLES</span><h2>Conhecimento de acesso gratuito</h2><p>Experimenta um percurso completo antes do teu próximo investimento.</p></div><button class="text-link" data-action="market-free">Ver gratuitos ${icon("arrow")}</button></div><div class="market-grid">${free.map(marketCard).join("")}</div></section><section class="teach-banner market-container"><div class="teach-symbol" aria-hidden="true">aA<span>✳</span></div><div><span class="eyebrow">QUEM ENSINA TAMBÉM ABRE CAMINHOS</span><h2>O que sabes pode ser<br>o começo de alguém.</h2><p>Descobre o percurso para preparar uma proposta de curso na Kuvona.</p>${link("Quero partilhar conhecimento " + icon("arrow"), "teach")}</div></section>`;
}

export function catalog(wishlist = false) {
  const s = getState(),
    query = marketUI.search.trim().toLocaleLowerCase("pt");
  let courses = s.catalog.filter(
    (c) =>
      (!wishlist || s.favorites.includes(c.id)) &&
      (marketUI.category === "Todos" || c.category === marketUI.category) &&
      (marketUI.level === "all" || c.level === marketUI.level) &&
      (marketUI.price === "all" ||
        (marketUI.price === "free" ? c.price === 0 : c.price > 0)) &&
      (marketUI.duration === "all" ||
        (marketUI.duration === "short" ? c.minutes <= 45 : c.minutes > 45)) &&
      (!query ||
        `${c.title} ${c.subtitle} ${c.category} ${(c.skills || []).join(" ")}`
          .toLocaleLowerCase("pt")
          .includes(query)),
  );
  if (marketUI.sort === "price") courses.sort((a, b) => a.price - b.price);
  if (marketUI.sort === "title")
    courses.sort((a, b) => a.title.localeCompare(b.title, "pt"));
  if (marketUI.sort === "duration")
    courses.sort((a, b) => a.minutes - b.minutes);
  if (marketUI.sort === "rating")
    courses.sort(
      (a, b) => reviewSummary(s, b.id).average - reviewSummary(s, a.id).average,
    );
  const pages = Math.max(1, Math.ceil(courses.length / marketUI.pageSize));
  marketUI.page = Math.min(marketUI.page, pages);
  const page = courses.slice(
    (marketUI.page - 1) * marketUI.pageSize,
    marketUI.page * marketUI.pageSize,
  );
  const filtersActive =
    marketUI.category !== "Todos" ||
    marketUI.price !== "all" ||
    marketUI.level !== "all" ||
    marketUI.duration !== "all" ||
    query;
  return `<div class="market-container catalog-page"><div class="store-breadcrumb"><a href="#home">Início</a>${icon("chevron")}<span>${wishlist ? "Lista de desejos" : "Todos os cursos"}</span></div><div class="store-section-heading"><div><span class="eyebrow">${wishlist ? "AS IDEIAS QUE GUARDASTE" : "APRENDE COM INTENÇÃO"}</span><h1>${wishlist ? "A tua lista de desejos" : query ? `Resultados para “${e(marketUI.search)}”` : marketUI.category === "Todos" ? "Um novo conhecimento.\nUm novo caminho." : `Cursos de ${e(marketUI.category)}`}</h1><p>${wishlist ? "Regressa aos cursos que despertaram a tua curiosidade." : "Abre os detalhes para conhecer o curso antes de te inscreveres."}</p></div></div><div class="catalog-controls"><label class="search-field">${icon("search")}<input id="catalog-search" value="${e(marketUI.search)}" placeholder="Pesquisa por curso, tema ou competência" aria-label="Pesquisar cursos"></label><span class="catalog-count" aria-live="polite">${courses.length} ${courses.length === 1 ? "curso encontrado" : "cursos encontrados"}</span><label class="sr-only" for="market-sort">Ordenar cursos</label><select class="select" id="market-sort">${[
    ["recommended", "Recomendados"],
    ["title", "Nome: A–Z"],
    ["price", "Preço: menor primeiro"],
    ["duration", "Duração: mais curtos"],
    ["rating", "Avaliação local"],
  ]
    .map(
      ([key, label]) =>
        `<option value="${key}" ${marketUI.sort === key ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select><div class="layout-toggle"><button data-action="market-layout" data-value="grid" class="icon-button ${marketUI.layout === "grid" ? "active" : ""}" aria-label="Ver em grelha" aria-pressed="${marketUI.layout === "grid"}">${icon("grid")}</button><button data-action="market-layout" data-value="list" class="icon-button ${marketUI.layout === "list" ? "active" : ""}" aria-label="Ver em lista" aria-pressed="${marketUI.layout === "list"}">${icon("menu")}</button></div></div><div class="catalog-layout"><aside class="catalog-filters"><details ${matchMedia("(min-width:561px)").matches || marketUI.filtersOpen ? "open" : ""}><summary>${icon("settings")} Filtrar cursos</summary><section><h3>Área de aprendizagem</h3>${["Todos", ...categories()].map((c) => `<button class="catalog-category ${marketUI.category === c ? "active" : ""}" data-action="market-category" data-value="${e(c)}"><span>${e(c)}</span><small>${c === "Todos" ? s.catalog.length : s.catalog.filter((x) => x.category === c).length}</small></button>`).join("")}</section><section><h3>Preço</h3>${[
    ["all", "Todos"],
    ["free", "Gratuitos"],
    ["paid", "Pagos · demonstração"],
  ]
    .map(
      ([key, label]) =>
        `<label class="catalog-radio"><input type="radio" name="market-price" value="${key}" ${marketUI.price === key ? "checked" : ""}>${label}</label>`,
    )
    .join(
      "",
    )}</section><section><h3>Nível</h3><select id="market-level" class="select"><option value="all">Todos os níveis</option>${[...new Set(s.catalog.map((c) => c.level))].map((l) => `<option ${marketUI.level === l ? "selected" : ""}>${e(l)}</option>`).join("")}</select></section><section><h3>Tempo de estudo</h3><select id="market-duration" class="select"><option value="all">Qualquer duração</option><option value="short" ${marketUI.duration === "short" ? "selected" : ""}>Até 45 minutos</option><option value="long" ${marketUI.duration === "long" ? "selected" : ""}>Mais de 45 minutos</option></select></section>${button("Limpar filtros", "market-clear", "", "secondary block small")}</details></aside><div><div class="catalog-active-filters">${filtersActive ? `<span>Filtros aplicados</span>${marketUI.category !== "Todos" ? `<span class="badge">${e(marketUI.category)}</span>` : ""}${marketUI.price !== "all" ? `<span class="badge">${marketUI.price === "free" ? "Gratuitos" : "Pagos"}</span>` : ""}<button class="text-link" data-action="market-clear">Limpar tudo</button>` : "<span>Encontra uma competência para o teu próximo objetivo.</span>"}</div>${page.length ? `<div class="market-grid catalog-results ${marketUI.layout === "list" ? "as-list" : ""}">${page.map(marketCard).join("")}</div><nav class="pagination" aria-label="Páginas do catálogo"><button class="icon-button" data-action="market-page" data-value="${marketUI.page - 1}" ${marketUI.page === 1 ? "disabled" : ""} aria-label="Página anterior">${icon("back")}</button>${Array.from({ length: pages }, (_, i) => `<button data-action="market-page" data-value="${i + 1}" class="${marketUI.page === i + 1 ? "active" : ""}" ${marketUI.page === i + 1 ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}<button class="icon-button" data-action="market-page" data-value="${marketUI.page + 1}" ${marketUI.page === pages ? "disabled" : ""} aria-label="Próxima página">${icon("arrow")}</button></nav>` : empty(wishlist && !filtersActive ? "Ainda não guardaste nenhum curso" : "Não encontrámos cursos com estes filtros", wishlist ? "Usa o coração nos cursos que queres conhecer melhor." : "Experimenta outra palavra ou limpa os filtros.", wishlist && !filtersActive ? link("Explorar cursos", "catalog") : button("Limpar pesquisa", "market-clear"), "compass")}</div></div></div>`;
}

function courseFAQs(c) {
  return [
    [
      "Preciso de experiência anterior?",
      c.requirements?.join(" ") ||
        "O curso foi preparado para quem está a começar. Lê os objetivos e a pré-visualização para perceber se corresponde ao que procuras.",
    ],
    [
      "Como funciona o acesso?",
      `Depois da inscrição, o curso aparece em Minha aprendizagem. Podes avançar pelas ${c.lessons.length} aulas ao teu ritmo, guardar notas e voltar ao conteúdo neste navegador.`,
    ],
    [
      "Como obtenho o certificado?",
      "Conclui todas as aulas e obtém pelo menos 70% na avaliação. O certificado desta demonstração é local e não tem validade académica.",
    ],
    [
      "Existe alguma cobrança nesta versão?",
      "Não. O checkout permite experimentar M-Pesa e e-Mola sem contactar uma carteira e sem cobrar valores.",
    ],
  ];
}
export function detail(c) {
  const s = getState(),
    enrolled = s.enrollments.includes(c.id),
    modules = [...new Set(c.lessons.map((l) => l.module))],
    related = s.catalog
      .filter((x) => x.id !== c.id)
      .sort((a, b) => (b.category === c.category) - (a.category === c.category))
      .slice(0, 3),
    requirements = c.requirements?.length
      ? c.requirements
      : ["Um dispositivo para estudar e vontade de praticar."],
    audience = c.audience?.length
      ? c.audience
      : ["Pessoas interessadas em " + c.category.toLocaleLowerCase("pt") + "."];
  const buy = () =>
    enrolled
      ? link("Ir para a aprendizagem " + icon("arrow"), learnURL(c), "block")
      : button(
          c.price
            ? "Comprar agora · " + money(c.price)
            : "Inscrever-me gratuitamente",
          "enroll",
          `data-id="${c.id}"`,
          "block",
        );
  return `<section class="course-hero-band"><div class="market-container"><div class="store-breadcrumb"><a href="#home">Início</a>${icon("chevron")}<a href="#catalog">Cursos</a>${icon("chevron")}<button data-action="market-category" data-value="${e(c.category)}">${e(c.category)}</button></div><div class="course-hero-copy"><span class="course-topic">${e(c.category)} · ${e(c.level)}</span><h1>${e(c.title)}</h1><p class="course-hero-subtitle">${e(c.subtitle)}</p><p class="course-hero-description">${e(c.description)}</p>${rating(c)}<p class="created-by">Criado por <a href="#instructor/${profileSlug(c.instructor)}">${e(c.instructor)}</a></p><div class="course-hero-facts"><span>${icon("book")}${c.lessons.length} aulas</span><span>${icon("clock")}${c.minutes} min de estudo estimado</span><span>${icon("message")}Português</span><span>${icon("target")}${e(c.level)}</span></div></div></div></section><div class="market-container detail-layout"><div class="course-main-content"><nav class="course-section-nav" aria-label="Explorar os detalhes">${[
    ["objectives", "O que vais aprender"],
    ["curriculum", "Programa"],
    ["requirements", "Requisitos"],
    ["instructor", "Instrutor"],
    ["reviews", "Avaliações"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="course-section" data-value="${id}">${label}</button>`,
    )
    .join(
      "",
    )}</nav><section id="course-objectives" class="detail-section outcomes-box"><h2>O que vais aprender</h2><ul class="outcomes">${c.outcomes.map((t) => `<li>${icon("check")}${e(t)}</li>`).join("")}</ul></section>${c.project ? `<section class="course-project detail-section"><div class="project-symbol">${icon("target")}</div><div><span class="eyebrow">APRENDE. E PÕE EM PRÁTICA.</span><h2>O teu projeto neste curso</h2><p>${e(c.project)}</p></div></section>` : ""}<section id="course-curriculum" class="detail-section curriculum"><div class="split"><h2>Conteúdo do curso</h2><button class="text-link" data-action="curriculum-expand">Expandir todas as secções</button></div><p class="curriculum-summary">${modules.length} secções · ${c.lessons.length} aulas · ${c.minutes} minutos de estudo estimado</p><div class="store-curriculum">${modules
    .map(
      (m, i) =>
        `<details ${i === 0 ? "open" : ""}><summary><span>${icon("chevron")}${e(m)}</span><small>${c.lessons.filter((l) => l.module === m).length} aulas · ${c.lessons.filter((l) => l.module === m).reduce((n, l) => n + l.minutes, 0)} min</small></summary>${c.lessons
          .filter((l) => l.module === m)
          .map(
            (l) =>
              `<div class="curriculum-row"><span>${icon(l.video ? "play" : "file")}${enrolled ? `<a href="#learn/${c.id}/${l.id}">${e(l.title)}</a>` : e(l.title)}</span><span>${l.id === c.lessons[0].id ? `<button class="text-link preview-link" data-action="course-preview" data-id="${c.id}">Pré-visualizar</button>` : enrolled ? "" : icon("lock")}<small>${l.minutes} min</small></span></div>`,
          )
          .join("")}</details>`,
    )
    .join(
      "",
    )}<div class="curriculum-row assessment-curriculum"><span>${icon("award")}Avaliação final</span><small>${c.quiz.length} perguntas · aprovação ≥ 70%</small></div></div></section><section id="course-requirements" class="detail-section"><h2>Requisitos</h2><ul class="detail-bullets">${requirements.map((t) => `<li>${e(t)}</li>`).join("")}</ul></section><section class="detail-section"><h2>Um curso para aprender com intenção</h2><p>${e(c.description)}</p><p>O percurso combina ${c.lessons.some((l) => l.video) ? "vídeos públicos selecionados, " : ""}leitura, atividades práticas e uma avaliação final. Não precisas de concluir tudo numa sessão: guarda as tuas notas e regressa ao curso quando fizer sentido.</p><h3>Para quem é este curso</h3><ul class="detail-bullets">${audience.map((t) => `<li>${e(t)}</li>`).join("")}</ul><div class="skill-tags">${(c.skills || []).map((t) => `<button data-action="market-skill" data-value="${e(t)}">${e(t)}</button>`).join("")}</div></section><section id="course-instructor" class="detail-section instructor-block"><h2>Conhece quem preparou o percurso</h2><a class="instructor-profile-link" href="#instructor/${profileSlug(c.instructor)}"><span class="instructor-large-avatar">${e(c.initials)}</span><span><b>${e(c.instructor)}</b><small>Conteúdo editorial e aprendizagem prática</small><span>Ver perfil e cursos ${icon("arrow")}</span></span></a><p>${e(c.instructorBio || "Equipa editorial da Kuvona. Conteúdo de prática preparado para esta demonstração.")}</p>${c.lessons.some((l) => l.video) ? '<div class="info-box">Os vídeos públicos pertencem aos respetivos autores, identificados junto ao leitor. A pré-visualização e os links originais continuam acessíveis.</div>' : ""}</section><section id="course-reviews" class="detail-section">${reviews(c)}</section><section class="detail-section"><h2>Antes de começares</h2><div class="faq">${courseFAQs(
    c,
  )
    .map(([q, a]) => `<details><summary>${q}</summary><p>${e(a)}</p></details>`)
    .join(
      "",
    )}</div></section></div><aside class="course-purchase-column"><section class="course-purchase-card"><button class="course-preview-cover" data-action="course-preview" data-id="${c.id}" aria-label="Pré-visualizar ${e(c.title)}"><span class="preview-art ${c.color}"><span>${e(c.symbol)}</span></span><span class="preview-play">${icon("play")}</span><b>Pré-visualizar este curso</b></button><div class="course-purchase-body"><span class="eyebrow">UM PASSO NO TEU DESENVOLVIMENTO</span><div class="detail-price">${money(c.price)}</div>${buy()}${button(icon("heart") + (s.favorites.includes(c.id) ? " Guardado na lista" : "Guardar para mais tarde"), "favorite", `data-id="${c.id}"`, "secondary block")}<p class="purchase-caption">${enrolled ? "Este curso já está na tua aprendizagem." : c.price ? "Inscrição única · pagamento demonstrativo" : "Percurso gratuito · sem dados de pagamento"}</p><h3>Este curso inclui</h3><ul class="course-includes"><li>${icon("book")}${c.lessons.length} aulas com atividade prática</li><li>${icon("clock")}${c.minutes} minutos de estudo estimado</li><li>${icon("file")}${c.resources.length} ${c.resources.length === 1 ? "material" : "materiais"} de apoio</li><li>${icon("edit")}Anotações pessoais por aula</li><li>${icon("award")}Avaliação e certificado demo</li><li>${icon("calendar")}Agenda e progresso ao teu ritmo</li></ul><div class="purchase-actions">${button(icon("external") + " Partilhar", "share-course", `data-id="${c.id}"`, "small secondary")}<a href="#help">Precisas de ajuda?</a></div><div class="purchase-disclaimer">Demonstração local. Nenhum valor é cobrado. O certificado é demonstrativo.</div></div></section></aside></div><section class="market-container market-section related-courses"><div class="store-section-heading"><div><span class="eyebrow">CONTINUA A DESCOBRIR</span><h2>Mais caminhos para explorar</h2></div></div><div class="market-grid three">${related.map(marketCard).join("")}</div></section><div class="mobile-course-purchase"><div><strong>${money(c.price)}</strong><small>${e(c.subtitle)}</small></div>${buy()}</div>`;
}

export function reviews(c) {
  const s = getState(),
    summary = reviewSummary(s, c.id),
    list = (s.reviews || []).filter((r) => r.courseId === c.id),
    canReview = s.enrollments.includes(c.id) && s.progress[c.id]?.length;
  return `<div class="split"><h2>Avaliações do curso</h2>${canReview ? button(list.length ? "Editar a minha avaliação" : "Avaliar este curso", "course-review", `data-id="${c.id}"`, "secondary small") : ""}</div>${summary.count ? `<div class="review-overview"><div><strong>${summary.average.toFixed(1).replace(".", ",")}</strong><span>${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</span><small>${summary.count} avaliação neste navegador</small></div><div class="rating-distribution">${summary.distribution.map((r) => `<div><span>${r.stars} ★</span><div class="progress"><span style="width:${(r.count / summary.count) * 100}%"></span></div><small>${r.count}</small></div>`).join("")}</div></div>${list.map((r) => `<article class="public-review"><div><span class="avatar">${e(r.name.slice(0, 2).toUpperCase())}</span><span><b>${e(r.name)}</b><small>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} · ${date(r.at)}</small></span></div><p>${e(r.text)}</p></article>`).join("")}` : `<div class="no-reviews">${icon("message")}<h3>A primeira opinião pode ser a tua.</h3><p>Ainda não existem avaliações neste navegador. Depois de te inscreveres e concluíres uma aula, podes partilhar o que aprendeste.</p></div>`}<p class="local-review-note">As avaliações são escritas por quem usa esta demonstração e ficam apenas neste navegador. Não mostramos classificações nem números de estudantes inventados.</p>`;
}

export function instructor(slug) {
  const courses = instructorCourses(slug);
  if (!courses.length)
    return `<div class="market-container market-section">${empty("Perfil não encontrado", "Explora o catálogo para conhecer quem prepara os cursos.", link("Explorar cursos", "catalog"))}</div>`;
  const first = courses[0];
  return `<div class="market-container instructor-page"><div class="store-breadcrumb"><a href="#home">Início</a>${icon("chevron")}<span>Quem ensina</span></div><div class="instructor-page-top"><div><span class="eyebrow">CONHECIMENTO QUE SE PARTILHA</span><h1>${e(first.instructor)}</h1><p class="instructor-tagline">Conteúdo editorial. Prática com intenção.</p><p>${e(first.instructorBio || "Equipa editorial da Academia Kuvona.")}</p><div class="instructor-actual-facts"><span><b>${courses.length}</b> cursos no catálogo</span><span><b>${courses.reduce((n, c) => n + c.lessons.length, 0)}</b> aulas preparadas</span></div></div><span class="instructor-portrait">${e(first.initials)}<small>✳</small></span></div><section class="market-section"><h2>Aprende com ${e(first.instructor)}</h2><div class="market-grid">${courses.map(marketCard).join("")}</div></section></div>`;
}

export function checkout(c, allowed) {
  const s = getState();
  if (!allowed)
    return `<div class="market-container checkout-page">${empty("Conhece o curso antes de te inscreveres", "A inscrição começa na página do curso, onde podes consultar os objetivos, o programa e a pré-visualização.", link("Ver detalhes do curso " + icon("arrow"), `course/${c.id}`), "book")}</div>`;
  return `<div class="market-container checkout-page"><div class="checkout-breadcrumb"><a href="#course/${c.id}">1. Conhecer o curso</a>${icon("chevron")}<b>2. Concluir inscrição</b>${icon("chevron")}<span>3. Começar a aprender</span></div><h1>O teu próximo passo está aqui.</h1><p>Confirma o curso e experimenta a inscrição. Não será efetuada nenhuma cobrança.</p><div class="checkout-layout"><section class="panel"><h2>Dados de inscrição</h2><form data-form="checkout" data-course="${c.id}"><div class="field-row">${field("O teu nome", "student-name", s.profile.name, "text", 'required maxlength="100" autocomplete="name"')}${field("Email (opcional)", "student-email", s.profile.email, "email", 'maxlength="150" autocomplete="email"')}</div><h3>Escolhe o método de pagamento</h3><div class="payment-methods"><label><input type="radio" name="method" value="M-Pesa" checked><span class="wallet-brand mpesa">M</span><span><b>M-Pesa</b><small>Carteira móvel · simulação</small></span></label><label><input type="radio" name="method" value="e-Mola"><span class="wallet-brand emola">e</span><span><b>e-Mola</b><small>Carteira móvel · simulação</small></span></label></div>${field("Número de telemóvel", "payment-phone", "", "tel", 'required placeholder="84 123 4567" inputmode="tel" maxlength="17"')}<div class="info-box">Usa um número de exemplo válido, como 841234567. Não pedimos PIN e nenhum pedido será enviado ao telefone.</div><label class="check-inline"><input type="checkbox" name="acknowledged" required>Entendo que estou a experimentar uma inscrição simulada.</label><p id="checkout-error" class="error-message" role="alert" hidden></p><button class="btn block checkout-submit" type="submit">Concluir inscrição demo · ${money(c.price)} ${icon("arrow")}</button></form></section><aside class="checkout-summary panel"><h2>Resumo da inscrição</h2><div class="checkout-course-summary"><span class="checkout-course-art ${c.color}">${e(c.symbol)}</span><div><h3>${e(c.title)}</h3><p>${e(c.instructor)}</p><small>${c.lessons.length} aulas · ${c.minutes} min</small></div></div><div class="summary-price"><span>Curso completo</span><b>${money(c.price)}</b></div><div class="summary-price total"><span>Total demonstrativo</span><b>${money(c.price)}</b></div><ul class="course-includes"><li>${icon("check")}Acesso à área de aprendizagem</li><li>${icon("check")}Materiais e anotações pessoais</li><li>${icon("check")}Avaliação final e certificado demo</li></ul><div class="info-box warning">Ambiente local. O preço é demonstrativo e não será cobrado.</div><a class="text-link" href="#course/${c.id}">${icon("back")} Rever os detalhes do curso</a></aside></div></div>`;
}

export function purchase(orderId, freeCourseId) {
  const s = getState(),
    order = s.orders.find((o) => o.id === orderId),
    c = s.catalog.find((c) => c.id === (freeCourseId || order?.courseId)),
    confirmed = freeCourseId
      ? s.enrollments.includes(freeCourseId)
      : order?.status === "confirmed";
  if (
    !c ||
    (freeCourseId && (c.price !== 0 || !s.enrollments.includes(freeCourseId)))
  )
    return `<div class="market-container market-section">${empty("Não encontrámos esta inscrição", "Consulta as tuas inscrições no teu espaço.", link("Ver inscrições", "payments"))}</div>`;
  return `<div class="market-container purchase-page"><div class="purchase-result"><div class="purchase-result-icon">${icon(confirmed ? "check" : order?.status === "pending" ? "clock" : "wallet")}</div><span class="eyebrow">${confirmed ? "UM NOVO COMEÇO" : order?.status === "pending" ? "PEDIDO CRIADO" : "ESTADO DA INSCRIÇÃO"}</span><h1>${confirmed ? "O teu próximo capítulo começa agora." : order?.status === "pending" ? "A inscrição aguarda confirmação." : "Vamos tentar de outra forma?"}</h1><p>${confirmed ? `O curso “${e(c.title)}” já está na tua aprendizagem.` : order?.status === "pending" ? "Experimenta abaixo o resultado do pagamento. Podes regressar mais tarde: o pedido mantém-se pendente." : "O acesso só é concedido depois de um pedido confirmado."}</p>${order ? statusBadge(order.status) : '<span class="badge success">Inscrição gratuita concluída</span>'}<div class="purchase-result-actions">${confirmed ? link("Começar a aprender " + icon("arrow"), learnURL(c)) : link("Rever detalhes do curso", `course/${c.id}`, "secondary")}${link("Minha aprendizagem", "courses", "secondary")}</div></div>${order?.status === "pending" ? `<section class="panel payment-simulator"><h2>Experimenta o resultado do pagamento</h2><p>Estes controlos pertencem à demonstração; numa integração real o resultado viria do fornecedor.</p><div class="filters">${button("Simular confirmação", "resolve-payment", `data-id="${order.id}" data-status="confirmed"`)}${button("Simular falha", "resolve-payment", `data-id="${order.id}" data-status="failed"`, "secondary")}${button("Simular expiração", "resolve-payment", `data-id="${order.id}" data-status="expired"`, "secondary")}${button("Cancelar pedido", "resolve-payment", `data-id="${order.id}" data-status="cancelled"`, "danger")}</div></section>` : ""}${order ? `<section class="panel purchase-record"><h2>O teu registo</h2><div class="summary-price"><span>Curso</span><b>${e(order.courseTitle)}</b></div><div class="summary-price"><span>Valor demonstrativo</span><b>${money(order.amount)}</b></div><div class="summary-price"><span>Método</span><b>${e(order.method)} · ${e(order.phone)}</b></div><ul class="timeline">${order.history.map((h) => `<li>${statusText(h.status)}<small>${date(h.at, { hour: "2-digit", minute: "2-digit" })}</small></li>`).join("")}</ul>${button(icon("download") + " Descarregar registo", "receipt", `data-id="${order.id}"`, "secondary")}<p class="local-review-note">Registo local demonstrativo. Não é uma fatura fiscal.</p></section>` : `<div class="panel"><h2>Pronto para a primeira aula?</h2><p>Começa com o conteúdo, experimenta a atividade e acompanha a tua evolução no teu espaço.</p></div>`}</div>`;
}

export function about() {
  return `<div class="market-container about-page"><span class="eyebrow">SOBRE A KUVONA</span><h1>Aprender abre caminhos.<br>Praticar ajuda-te a percorrê-los.</h1><p class="about-lead">A Kuvona é uma proposta de academia digital em português, pensada para aproximar conhecimento útil de quem quer dar o próximo passo.</p><div class="about-pillars"><section><span>01</span><h2>Escolhas com contexto</h2><p>Antes de te inscreveres, podes conhecer os objetivos, os requisitos, o programa e a primeira aula de cada percurso.</p></section><section><span>02</span><h2>Aprendizagem com prática</h2><p>Leitura e vídeos dão o ponto de partida. As atividades e os materiais ajudam-te a aplicar os conceitos ao teu projeto.</p></section><section><span>03</span><h2>Um ritmo que cabe na tua vida</h2><p>O caderno, a agenda e o progresso ajudam-te a voltar ao estudo sem perder o fio à tua aprendizagem.</p></section></div><div class="info-box">Esta versão é uma demonstração local: perfis, inscrições, pagamentos e certificados não têm integração com serviços externos. A documentação no projeto prepara a próxima etapa de desenvolvimento.</div>${link("Encontra o teu próximo curso " + icon("arrow"), "catalog")}</div>`;
}
export function teach() {
  return `<div class="market-container teach-page"><div><span class="eyebrow">ENSINA NA KUVONA</span><h1>O teu conhecimento<br>pode abrir um caminho.</h1><p class="about-lead">Começa por uma ideia clara: quem queres ajudar, o que essa pessoa vai conseguir fazer e como pode pôr o conhecimento em prática.</p><div class="practice-steps"><div><span>01</span><b>Define a transformação</b><p>Escolhe o público e um resultado realista.</p></div><div><span>02</span><b>Desenha o percurso</b><p>Organiza aulas curtas, atividades e materiais.</p></div><div><span>03</span><b>Prepara a experiência</b><p>Revê a clareza do conteúdo e testa a avaliação.</p></div></div><a class="text-link" href="#admin">Experimentar o editor de cursos na gestão demo ${icon("arrow")}</a></div><section class="panel"><h2>Prepara a tua proposta</h2><p>O formulário guarda a proposta no apoio local da demonstração. Não envia mensagens externas.</p><form data-form="teach-proposal">${field("Nome", "name", getState().profile.name, "text", 'required maxlength="100"')}${field("Email", "email", getState().profile.email, "email", 'required maxlength="150"')}${field("Tema do curso", "topic", "", "text", 'required maxlength="150"')}${textarea("Para quem é e o que vai aprender?", "proposal", "", 'required minlength="30" maxlength="3000"')}<button class="btn block" type="submit">Guardar proposta local ${icon("arrow")}</button></form></section></div>`;
}
