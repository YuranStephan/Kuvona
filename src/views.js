import {
  escapeHTML as e,
  money,
  courseProgress,
  eligible,
  PASS_SCORE,
} from "./domain.js";
import { getState, getStorageStatus } from "./store.js";
import {
  icon,
  button,
  link,
  heading,
  empty,
  progressBar,
  date,
  dateKey,
  nextLesson,
  learnURL,
  courseCard,
  cover,
  field,
  textarea,
  heroArt,
  statusBadge,
} from "./ui.js";
export const titles = {
  dashboard: "Visão geral",
  courses: "Meus cursos",
  catalog: "Explorar cursos",
  favorites: "Favoritos",
  planner: "Agenda de estudos",
  certificates: "Certificados",
  payments: "Pagamentos",
  settings: "Definições",
  help: "Centro de ajuda",
  admin: "Gestão da academia",
  course: "Detalhes do curso",
  learn: "Sala de aula",
  assessment: "Avaliação",
};
export const ui = {
  category: "Todos",
  search: "",
  sort: "recommended",
  price: "all",
  courseStatus: "all",
  lessonTab: "overview",
  adminTab: "catalog",
  monthOffset: 0,
  result: null,
};
const current = () => location.hash.slice(1).split("/");
export function shell(content) {
  const s = getState(),
    [route] = current();
  const nav = (routeKey, label, name, count = "") =>
    `<a class="nav-link ${route === routeKey || (!route && routeKey === "dashboard") ? "active" : ""}" href="#${routeKey}" ${route === routeKey ? 'aria-current="page"' : ""}>${icon(name)}<span>${label}</span>${count !== "" ? `<span class="count">${count}</span>` : ""}</a>`;
  return `<aside class="sidebar" id="sidebar"><a class="brand" href="#dashboard" aria-label="Kuvona, início">kuvona<span>✳</span></a><div class="brand-label">ACADEMIA DIGITAL</div><div class="nav-label">O TEU ESPAÇO</div><nav aria-label="Aprendizagem">${nav("dashboard", "Visão geral", "grid")}${nav("courses", "Meus cursos", "book", s.enrollments.length)}${nav("catalog", "Explorar cursos", "compass")}${nav("planner", "Agenda de estudos", "calendar")}${nav("certificates", "Certificados", "award")}${nav("favorites", "Favoritos", "heart")}</nav><div class="nav-label">A TUA CONTA</div><nav aria-label="Conta">${nav("payments", "Pagamentos", "wallet")}${nav("settings", "Definições", "settings")}${nav("help", "Centro de ajuda", "help")}${nav("admin", "Gestão · demo", "shield")}</nav><div class="sidebar-bottom"><div class="sidebar-promo">${icon("target")}<h4>Pequenos passos. Grandes mudanças.</h4><p>Reserva tempo para o teu próximo conhecimento.</p><a href="#planner">Organizar a minha semana →</a></div><div class="demo-badge"><span class="dot"></span>Experiência local · v3.0</div></div></aside><button class="menu-scrim" id="menu-scrim" data-action="menu" aria-label="Fechar menu"></button><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir menu" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button><div class="breadcrumb">Academia ${icon("chevron")} <b>${titles[route] || "Visão geral"}</b></div><div class="top-actions"><form class="top-search" data-form="global-search">${icon("search")}<input name="q" placeholder="O que queres aprender?" aria-label="Pesquisar cursos"><kbd>Ctrl K</kbd></form><button class="icon-button" data-action="theme" aria-label="Alternar tema claro e escuro">${icon("sun")}</button><button class="icon-button" data-action="notifications" aria-label="Ver atividade">${icon("bell")}${s.activity.length ? '<span class="notification-dot"></span>' : ""}</button><a href="#settings" class="profile-button" aria-label="Editar perfil"><span class="avatar">${e(
    s.profile.name
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join(""),
  )}</span><span class="profile-meta"><b>${e(s.profile.name)}</b><small>Conta de estudante</small></span></a></div></header><main id="main" class="main" tabindex="-1">${getStorageStatus().ok ? "" : `<div class="info-box warning" role="alert">${e(getStorageStatus().warning)}</div>`}${content}<footer class="footer"><span>© ${new Date().getFullYear()} Academia Kuvona. O teu próximo passo começa aqui.</span><span>Demonstração local · pagamentos e certificados simulados &nbsp; <a href="#help">Ajuda e privacidade</a></span></footer></main></div>`;
}
export function calendarPanel() {
  const now = new Date(),
    month = new Date(now.getFullYear(), now.getMonth() + ui.monthOffset, 1),
    pad = (month.getDay() + 6) % 7,
    count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    s = getState();
  return `<section class="panel"><div class="panel-title"><h3>A tua agenda</h3><a href="#planner" aria-label="Abrir agenda">${icon("calendar")}</a></div><div class="month"><button class="icon-button" data-action="calendar" data-delta="-1" aria-label="Mês anterior">${icon("back")}</button><span>${date(month, { month: "long", year: "numeric", day: undefined })}</span><button class="icon-button" data-action="calendar" data-delta="1" aria-label="Mês seguinte">${icon("arrow")}</button></div><div class="calendar">${["S", "T", "Q", "Q", "S", "S", "D"].map((d) => `<span class="weekday">${d}</span>`).join("")}${"<span></span>".repeat(pad)}${Array.from(
    { length: count },
    (_, i) => {
      const d = new Date(month.getFullYear(), month.getMonth(), i + 1),
        key = dateKey(d);
      return `<span class="day ${key === dateKey(now) ? "today" : ""} ${s.schedule.some((x) => x.date === key) ? "has-session" : ""}" ${key === dateKey(now) ? 'aria-current="date"' : ""}>${i + 1}</span>`;
    },
  ).join("")}</div><div class="mt">${
    s.schedule
      .filter((x) => !x.done && x.date >= dateKey())
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 2)
      .map((x) => sessionMini(x))
      .join("") ||
    '<p style="font-size:10px">A tua próxima sessão pode começar com 25 minutos.</p>'
  }<a class="text-link" href="#planner">Planear uma sessão ${icon("arrow")}</a></div></section>`;
}
function sessionMini(x) {
  const c = getState().catalog.find((c) => c.id === x.courseId);
  return `<div class="session"><span class="session-date"><small>${date(x.date + "T12:00", { month: "short", day: undefined })}</small>${Number(x.date.slice(-2))}</span><span class="session-info"><strong>${e(c?.subtitle || c?.title)}</strong><small>${e(x.time)} · ${x.minutes} min</small></span></div>`;
}
function weeklyGoal() {
  const s = getState(),
    now = new Date(),
    monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return dateKey(d);
    }),
    done = s.schedule.filter((x) => x.done && days.includes(x.date)).length,
    goal = s.preferences.goal,
    ratio = Math.min(1, done / goal);
  return `<section class="panel goal-panel"><div class="goal-top"><div class="goal-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="none" stroke="#d9e2c9" stroke-width="5"/><circle cx="32" cy="32" r="27" fill="none" stroke="#6d8d48" stroke-width="5" stroke-dasharray="${ratio * 170} 170" stroke-linecap="round"/></svg><b>${done}/${goal}</b></div><div><h3>A tua meta semanal</h3><p>${done >= goal ? "Meta alcançada. Mantém o ritmo!" : `Completa ${goal} sessões esta semana.`}</p></div></div><div class="goal-days">${days.map((d, i) => `<span class="goal-day ${s.schedule.some((x) => x.date === d && x.done) ? "done" : ""}">${["S", "T", "Q", "Q", "S", "S", "D"][i]}</span>`).join("")}</div></section>`;
}
export function dashboard() {
  const s = getState(),
    enrolled = s.catalog.filter((c) => s.enrollments.includes(c.id)),
    active =
      enrolled.find((c) => c.id === s.lastLesson.courseId) || enrolled[0],
    done = s.catalog.reduce((n, c) => n + courseProgress(s, c).done, 0),
    certs = s.catalog.filter((c) => eligible(s, c)).length;
  return `${heading(`Olá, ${e(s.profile.name.split(" ")[0])} <span class="muted">✳</span>`, "Um bom dia para aprender algo novo.", `<span class="date-label">${icon("calendar")}${date(new Date(), { weekday: "long", month: "long" })}</span>`)}<div class="dashboard-layout"><div><section class="hero"><div class="hero-copy"><span class="eyebrow">CADA PASSO CONTA</span><h2>Conhecimento que abre novos caminhos.</h2><p>O teu futuro constrói-se um pouco todos os dias. Continua de onde ficaste.</p>${link("Continuar a aprender " + icon("arrow"), active ? learnURL(active) : "catalog", "lime")}</div><div class="hero-art">${heroArt}<div class="hero-chip"><span class="chip-icon">${icon("award")}</span>Investe em ti. Vai mais longe.</div></div></section><div class="stats-grid">${stat("book", "Cursos inscritos", enrolled.length)}${stat("check", "Aulas concluídas", done, "clay")}${stat("award", "Certificados", certs, "lavender")}</div><div class="section-heading"><h2>Continua a tua jornada</h2><a class="text-link" href="#courses">Ver todos ${icon("arrow")}</a></div><div class="course-grid two ${enrolled.length === 1 ? "single" : ""}">${enrolled.slice(0, 2).map(courseCard).join("") || empty("O teu primeiro passo", "Encontra um curso que desperte a tua curiosidade.", link("Explorar cursos", "catalog"))}</div><div class="section-heading"><div><h2>Há mais para descobrir</h2><p>Novas competências, novas possibilidades.</p></div><a class="text-link" href="#catalog">Explorar ${icon("arrow")}</a></div><div class="course-grid two">${
    s.catalog
      .filter((c) => !s.enrollments.includes(c.id))
      .slice(0, 2)
      .map(courseCard)
      .join("") || s.catalog.slice(0, 2).map(courseCard).join("")
  }</div></div><aside class="rail">${calendarPanel()}${weeklyGoal()}<div class="quote-panel"><span class="quote-mark">“</span><p>O próximo passo não precisa de ser grande. Precisa de ser teu.</p><small>UM LEMBRETE DA KUVONA</small></div></aside></div>`;
}
function stat(type, label, value, color = "") {
  return `<div class="stat"><div class="stat-icon ${color}">${icon(type)}</div><div><div class="label">${label}</div><div class="stat-value">${value}</div></div></div>`;
}
export function listing(mode = "catalog") {
  const s = getState(),
    labels = {
      catalog: [
        "Descobre o teu próximo passo",
        "Conhecimento útil. Ao teu ritmo. Onde estiveres.",
      ],
      courses: ["Os teus cursos", "Cada aula é um passo em frente."],
      favorites: [
        "Guardados para mais tarde",
        "As ideias que despertaram a tua curiosidade.",
      ],
    },
    categories = ["Todos", ...new Set(s.catalog.map((c) => c.category))];
  let list = s.catalog.filter(
    (c) =>
      (mode !== "courses" || s.enrollments.includes(c.id)) &&
      (mode !== "favorites" || s.favorites.includes(c.id)),
  );
  list = list.filter(
    (c) =>
      (ui.category === "Todos" || c.category === ui.category) &&
      (!ui.search ||
        `${c.title} ${c.subtitle} ${c.category}`
          .toLocaleLowerCase("pt")
          .includes(ui.search.toLocaleLowerCase("pt"))) &&
      (ui.price === "all" ||
        (ui.price === "free" ? c.price === 0 : c.price > 0)) &&
      (mode !== "courses" ||
        ui.courseStatus === "all" ||
        (ui.courseStatus === "complete"
          ? courseProgress(s, c).percent === 100
          : courseProgress(s, c).percent < 100)),
  );
  if (ui.sort === "price") list.sort((a, b) => a.price - b.price);
  if (ui.sort === "title")
    list.sort((a, b) => a.title.localeCompare(b.title, "pt"));
  return `${heading(...labels[mode], mode === "courses" ? link("Explorar catálogo " + icon("plus"), "catalog", "secondary") : "")}<div class="toolbar"><label class="search-field">${icon("search")}<input id="catalog-search" placeholder="Pesquisar por curso ou tema…" value="${e(ui.search)}" aria-label="Pesquisar no catálogo"></label><select class="select" id="price-filter" aria-label="Filtrar por preço"><option value="all" ${ui.price === "all" ? "selected" : ""}>Todos os preços</option><option value="free" ${ui.price === "free" ? "selected" : ""}>Gratuitos</option><option value="paid" ${ui.price === "paid" ? "selected" : ""}>Pagos · demo</option></select><select class="select" id="sort-filter" aria-label="Ordenar cursos"><option value="recommended">Recomendados</option><option value="title" ${ui.sort === "title" ? "selected" : ""}>Nome A–Z</option><option value="price" ${ui.sort === "price" ? "selected" : ""}>Menor preço</option></select></div><div class="toolbar"><div class="filters">${categories.map((c) => `<button class="filter ${ui.category === c ? "active" : ""}" data-action="category" data-value="${e(c)}">${e(c)}</button>`).join("")}</div>${mode === "courses" ? `<select id="status-filter" class="select" aria-label="Estado do curso"><option value="all">Todos os estados</option><option value="active" ${ui.courseStatus === "active" ? "selected" : ""}>Em progresso</option><option value="complete" ${ui.courseStatus === "complete" ? "selected" : ""}>Aulas concluídas</option></select>` : `<small class="muted">${list.length} ${list.length === 1 ? "curso" : "cursos"}</small>`}</div>${list.length ? `<div class="course-grid">${list.map(courseCard).join("")}</div>` : empty("Um novo caminho está à tua espera", "Não há cursos com estes filtros. Experimenta limpar a pesquisa ou explorar o catálogo.", button("Limpar filtros", "clear-filters", "", "secondary"), "compass")}`;
}
export function learning(c, l) {
  const s = getState(),
    p = courseProgress(s, c),
    done = s.progress[c.id]?.includes(l.id),
    index = c.lessons.findIndex((x) => x.id === l.id);
  return `<div class="learning-top"><div><a class="eyebrow" href="#course/${c.id}">${e(c.subtitle || c.title)}</a><h1>${e(l.title)}</h1></div>${link(icon("back") + " Meus cursos", "courses", "secondary")}</div><div class="learning-layout"><div>${l.video ? `<div class="player-shell ${s.preferences.dataSaver ? "data-saving" : ""}" id="player-shell"><div class="player-placeholder"><button class="play" data-action="play" data-course="${c.id}" data-lesson="${l.id}" aria-label="Reproduzir vídeo">${icon("play")}</button><h3>Vamos aprender?</h3><p>${s.preferences.dataSaver ? "Poupança de dados ativa. O vídeo só carrega quando escolheres reproduzir." : "Carrega o vídeo quando estiveres pronto. O teu ponto de reprodução fica guardado."}</p><small>${s.positions[l.id] ? `Retomar aos ${Math.floor(s.positions[l.id] / 60)}:${String(Math.floor(s.positions[l.id] % 60)).padStart(2, "0")} · ` : ""}Reprodução pelo YouTube</small></div></div><div class="video-credit"><span>${e(l.source)}</span><a href="https://www.youtube.com/watch?v=${l.video}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a></div>` : `<div class="info-box">${icon("file")} Aula de leitura · ${l.minutes} minutos de estudo estimado. Lê o conteúdo e completa o exercício antes de marcar a aula.</div>`}<div class="lesson-actions">${button(icon(done ? "check" : "plus") + (done ? " Aula concluída" : " Marcar como concluída"), "complete", `data-course="${c.id}" data-lesson="${l.id}"`, done ? "soft" : "")}<span class="split">${index > 0 ? link(icon("back"), `learn/${c.id}/${c.lessons[index - 1].id}`, "secondary small") : ""}${index < c.lessons.length - 1 ? link("Próxima aula " + icon("arrow"), `learn/${c.id}/${c.lessons[index + 1].id}`, "secondary small") : link("Avaliação " + icon("arrow"), `assessment/${c.id}`, "secondary small")}</span></div><div class="tabs" role="tablist" aria-label="Conteúdo da aula">${[
    ["overview", "Sobre a aula"],
    ["notes", "Anotações"],
    ["resources", "Materiais"],
    ["discussion", "Discussão"],
  ]
    .map(
      ([key, label]) =>
        `<button class="tab ${ui.lessonTab === key ? "active" : ""}" role="tab" aria-selected="${ui.lessonTab === key}" data-action="lesson-tab" data-value="${key}">${label}</button>`,
    )
    .join(
      "",
    )}</div><div id="lesson-tab-content" role="tabpanel">${lessonContent(c, l)}</div></div><aside class="lesson-sidebar"><div class="heading"><h3>O teu percurso</h3><div class="progress-meta"><span>${p.done} de ${p.total} aulas concluídas</span><span>${p.percent}%</span></div>${progressBar(p.percent)}</div><div class="lesson-list-items">${c.lessons.map((x, i) => `${i === 0 || x.module !== c.lessons[i - 1].module ? `<div class="module">${e(x.module)}</div>` : ""}<a class="lesson-item ${x.id === l.id ? "active" : ""} ${s.progress[c.id]?.includes(x.id) ? "done" : ""}" href="#learn/${c.id}/${x.id}" ${x.id === l.id ? 'aria-current="step"' : ""}><span class="lesson-state">${s.progress[c.id]?.includes(x.id) ? "✓" : String(i + 1).padStart(2, "0")}</span><span>${e(x.title)}<small>${x.video ? "Vídeo + prática" : "Leitura + prática"} · ${x.minutes} min</small></span></a>`).join("")}</div><div class="assessment-link">${link(icon("award") + " Avaliação final", `assessment/${c.id}`, "block secondary small")}<p style="font-size:9px;margin:10px 0 0">Conclui todas as aulas para realizar a avaliação.</p></div></aside></div>`;
}
export function lessonContent(c, l) {
  const s = getState();
  switch (ui.lessonTab) {
    case "notes":
      return `<div class="split mb"><h3>O teu caderno</h3>${button(icon("download") + " Exportar", "export-notes", `data-course="${c.id}"`, "small secondary")}</div><label class="sr-only" for="lesson-notes">Anotações da aula</label><textarea class="notes-area" id="lesson-notes" maxlength="20000" data-course="${c.id}" data-lesson="${l.id}" placeholder="Ideias, dúvidas, próximos passos…">${e(s.notes[l.id] || "")}</textarea><p style="font-size:10px" id="note-status">Guardado automaticamente neste navegador.</p>`;
    case "resources":
      return `<h3>Leva a aprendizagem contigo</h3>${c.resources.map((r, i) => `<div class="resource"><div><strong>${icon("file")} ${e(r.title)}</strong><small>Ficheiro de texto · conteúdo de apoio da Kuvona</small></div>${button(icon("download") + " Descarregar", "resource", `data-course="${c.id}" data-index="${i}"`, "secondary small")}</div>`).join("") || "<p>Este curso não tem materiais adicionais.</p>"}`;
    case "discussion":
      return `<div class="info-box">Espaço de discussão local. As mensagens ficam neste navegador; ainda não são partilhadas com outros estudantes.</div><form data-form="discussion" data-course="${c.id}">${textarea("Partilha uma ideia ou dúvida", "message", "", 'required maxlength="3000"')}<button class="btn" type="submit">${icon("message")} Publicar neste espaço</button></form>${s.discussions
        .filter((x) => x.courseId === c.id)
        .map(
          (x) =>
            `<article class="post"><div class="post-header"><span class="avatar">${e(x.name.slice(0, 2).toUpperCase())}</span><div><b>${e(x.name)}</b><br><small>${date(x.at, { hour: "2-digit", minute: "2-digit" })}</small></div></div><p>${e(x.text)}</p></article>`,
        )
        .join("")}`;
    default:
      return `<article class="lesson-article"><h3>${e(l.title)}</h3>${l.content.map((p) => `<p>${e(p)}</p>`).join("")}<div class="practice"><span class="eyebrow">AGORA É CONTIGO</span><p>${e(l.task)}</p></div><p style="font-size:11px;color:var(--muted)">Marca a aula como concluída quando terminares o estudo e a prática. A marcação manual é uma declaração tua; não mede a aprendizagem.</p></article>`;
  }
}
export function assessment(c) {
  const s = getState(),
    p = courseProgress(s, c);
  if (p.percent < 100)
    return (
      heading("Um passo de cada vez", e(c.title)) +
      empty(
        "A avaliação está quase à tua espera",
        `Já concluíste ${p.done} de ${p.total} aulas. Termina o percurso para testar os teus conhecimentos.`,
        link("Continuar a aprender " + icon("arrow"), learnURL(c)),
        "award",
      )
    );
  const result = ui.result?.courseId === c.id ? ui.result : null;
  return `<div class="assessment">${heading("Mostra o que aprendeste", e(c.title), link("Voltar ao curso", `course/${c.id}`, "secondary"))}${result ? `<section class="panel"><span class="eyebrow">RESULTADO DESTA TENTATIVA</span><div class="score">${result.score}%</div><h2>${result.score >= PASS_SCORE ? "Parabéns, conseguiste!" : "Mais uma oportunidade para aprender."}</h2><p>${result.correct} de ${result.total} respostas corretas. A aprovação requer ${PASS_SCORE}%.</p>${c.quiz.map((q, i) => `<div class="result-row"><b>${result.answers[i] === q.correct ? "✓" : "○"} ${e(q.question)}</b><p>Resposta correta: ${e(q.options[q.correct])}. ${e(q.explanation)}</p></div>`).join("")}<div class="modal-footer">${button("Tentar novamente", "quiz-retry", `data-id="${c.id}"`, "secondary")}${eligible(s, c) ? link("Ver certificado " + icon("award"), "certificates") : link("Rever aulas", learnURL(c))}</div></section>` : `<div class="info-box">${c.quiz.length} perguntas · aprovação com ${PASS_SCORE}% · podes repetir. A melhor pontuação fica guardada.${s.assessments[c.id] ? ` Melhor resultado: ${s.assessments[c.id].score}%.` : ""}</div><form data-form="assessment" data-course="${c.id}">${c.quiz.map((q, i) => `<fieldset class="question"><legend>${i + 1}. ${e(q.question)}</legend>${q.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required>${e(o)}</label>`).join("")}</fieldset>`).join("")}<button class="btn" type="submit">Concluir avaliação ${icon("arrow")}</button></form>`}</div>`;
}
export function planner() {
  const s = getState(),
    sessions = [...s.schedule].sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time),
    );
  return `${heading("Dá tempo ao teu futuro", "Organiza sessões curtas. Cria uma rotina que cabe na tua vida.")}<div class="agenda-grid"><div>${
    sessions.length
      ? sessions
          .map((x) => {
            const c = s.catalog.find((c) => c.id === x.courseId);
            return `<article class="agenda-card ${x.done ? "done" : ""}"><span class="session-date"><small>${date(x.date + "T12:00", { month: "short", day: undefined })}</small>${Number(x.date.slice(-2))}</span><div class="session-info"><strong>${e(c?.title)}</strong><small>${e(x.time)} · ${x.minutes} min · ${x.done ? "Concluída" : x.date < dateKey() ? "Por concluir" : "Planeada"}</small></div><button class="icon-button" data-action="session-toggle" data-id="${x.id}" aria-label="${x.done ? "Reabrir" : "Concluir"} sessão">${icon("check")}</button><button class="icon-button" data-action="session-remove" data-id="${x.id}" aria-label="Eliminar sessão">${icon("trash")}</button></article>`;
          })
          .join("")
      : empty(
          "Reserva o teu primeiro momento",
          "Uma sessão de 25 minutos já é um bom começo. Usa o formulário ao lado.",
          "",
          "calendar",
        )
  }<div class="info-box">A agenda funciona nesta aplicação. Não envia notificações fora do navegador. Podes exportar cada sessão para o teu calendário.</div>${
    sessions.length
      ? `<div class="panel"><h3>Leva a agenda contigo</h3>${
          sessions
            .filter((x) => !x.done)
            .map(
              (x) =>
                `<div class="resource"><strong>${e(s.catalog.find((c) => c.id === x.courseId)?.subtitle)} · ${date(x.date + "T12:00")} ${x.time}</strong>${button("Exportar .ics", "calendar-export", `data-id="${x.id}"`, "secondary small")}</div>`,
            )
            .join("") || "<p>Todas as sessões estão concluídas.</p>"
        }</div>`
      : ""
  }</div><aside><section class="panel"><h3>Nova sessão de estudo</h3><form data-form="schedule"><div class="field"><label for="session-course">Curso</label><select id="session-course" name="courseId">${s.catalog.map((c) => `<option value="${c.id}">${e(c.title)}</option>`).join("")}</select></div>${field("Data", "date", dateKey(), "date", "required")}${field("Hora", "time", "18:00", "time", "required")}<div class="field"><label for="minutes">Duração</label><select id="minutes" name="minutes"><option value="25">25 minutos · uma pequena vitória</option><option value="45">45 minutos · aprofundar</option><option value="60">60 minutos · praticar</option></select></div><button class="btn block" type="submit">${icon("plus")} Agendar sessão</button></form></section><div class="mt">${weeklyGoal()}</div></aside></div>`;
}
export function certificates() {
  const s = getState(),
    earned = s.catalog.filter((c) => eligible(s, c)),
    ongoing = s.catalog.filter(
      (c) => s.enrollments.includes(c.id) && !eligible(s, c),
    );
  return `${heading("Conquistas que são tuas", "Cada certificado representa um percurso concluído.", button("Consultar código local", "verify", "", "secondary"))}${earned.length ? earned.map((c) => `<article class="certificate-card"><div><div class="certificate-emblem">${icon("award")}</div><span class="eyebrow">PERCURSO CONCLUÍDO</span><h2 class="mt">${e(c.title)}</h2><p>${e(s.certificates[c.id]?.name || s.profile.name)} · avaliação ${s.assessments[c.id].score}% · certificado demonstrativo</p></div>${button("Abrir certificado " + icon("arrow"), "certificate", `data-id="${c.id}"`)}</article>`).join("") : empty("O teu primeiro certificado começa numa aula", "Conclui todas as aulas de um curso e obtém pelo menos 70% na avaliação final.", link("Continuar a aprender", "courses"), "award")}${ongoing.length ? `<div class="section-heading"><h2>A caminho da próxima conquista</h2></div><div class="course-grid">${ongoing.map(courseCard).join("")}</div>` : ""}<div class="info-box">Certificados demonstrativos, sem acreditação ou validade académica. A consulta por código confirma apenas os registos deste navegador.</div>`;
}
export function payments(admin = false) {
  const s = getState();
  const table = s.orders.length
    ? `<div class="table-wrap"><table><thead><tr><th>Curso / referência</th><th>Data</th><th>Método</th><th>Valor</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${s.orders.map((o) => `<tr><td><strong class="table-title">${e(o.courseTitle)}</strong><small>${e(o.id.slice(0, 16))}…</small></td><td>${date(o.createdAt)}</td><td>${e(o.method)}<small>${e(o.phone)}</small></td><td>${money(o.amount)}</td><td>${statusBadge(o.status)}</td><td><div class="table-actions">${button(o.status === "pending" ? "Resolver" : "Detalhes", "order-details", `data-id="${o.id}"`, "small secondary")}${admin && o.status === "confirmed" ? button("Reembolsar", "refund", `data-id="${o.id}"`, "small danger") : ""}</div></td></tr>`).join("")}</tbody></table></div>`
    : empty(
        "Tudo em ordem por aqui",
        "As tuas inscrições pagas aparecerão aqui. Os cursos gratuitos não geram transações.",
        link("Explorar cursos", "catalog"),
        "wallet",
      );
  return admin
    ? table
    : `${heading("Os teus pagamentos", "Acompanha as inscrições e consulta o histórico de cada pedido.")}<div class="info-box warning">Ambiente de demonstração. Nenhum pedido é enviado ao M-Pesa ou e-Mola e nenhum valor é cobrado.</div>${table}`;
}
export function settings() {
  const s = getState();
  return `${heading("O teu espaço, à tua maneira", "Personaliza o perfil, a aprendizagem e os teus dados.")}<div class="settings-layout"><div><section class="panel"><h3>O teu perfil</h3><form data-form="profile"><div class="field-row">${field("Nome de apresentação", "name", s.profile.name, "text", 'required maxlength="100" autocomplete="name"')}${field("Email (opcional)", "email", s.profile.email, "email", 'maxlength="150" autocomplete="email"')}</div>${field("Telemóvel (opcional)", "phone", s.profile.phone, "tel", 'maxlength="25" autocomplete="tel"')}${textarea("Sobre ti", "bio", s.profile.bio, 'maxlength="500"')}<button class="btn" type="submit">Guardar perfil ${icon("check")}</button></form></section><section class="panel"><h3>Aprender com conforto</h3><label class="toggle-row"><span><strong>Tema escuro</strong><p>Um ambiente mais suave em pouca luz.</p></span><input type="checkbox" id="dark-toggle" ${s.preferences.theme === "dark" ? "checked" : ""}></label><label class="toggle-row"><span><strong>Poupança de dados</strong><p>Prioriza leitura. Os vídeos continuam disponíveis a pedido.</p></span><input type="checkbox" id="data-toggle" ${s.preferences.dataSaver ? "checked" : ""}></label><div class="toggle-row"><span><strong>Meta semanal</strong><p>Número de sessões planeadas a concluir.</p></span><select id="goal-select" class="select" aria-label="Meta semanal">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${s.preferences.goal === n ? "selected" : ""}>${n} ${n === 1 ? "sessão" : "sessões"}</option>`).join("")}</select></div></section><section class="panel"><h3>Os teus dados</h3><p style="font-size:12px">O progresso, as anotações e as definições vivem apenas neste navegador. Exporta uma cópia para os transferir ou guardar.</p><div class="split"><div class="filters">${button(icon("download") + " Exportar cópia", "backup", "", "secondary")}${button("Importar cópia", "import", "", "secondary")}</div>${button("Repor demo", "reset", "", "danger")}</div><input type="file" id="import-file" accept="application/json,.json" hidden></section></div><aside><section class="panel"><span class="avatar">${e(s.profile.name.slice(0, 2).toUpperCase())}</span><h3 class="mt">${e(s.profile.name)}</h3><p style="font-size:12px">${e(s.profile.bio || "A construir o próximo passo, uma aula de cada vez.")}</p><span class="badge">Conta local de demonstração</span></section><div class="info-box">Este perfil não é uma conta autenticada. Não existe sincronização entre dispositivos ou recuperação por email nesta versão.</div></aside></div>`;
}
export function help() {
  const s = getState(),
    faq = [
      [
        "Como funciona a aprendizagem?",
        "Inscreve-te num curso, estuda as aulas e faz os exercícios. Marca cada aula como concluída e termina a avaliação para obter o certificado demonstrativo.",
      ],
      [
        "Posso continuar sem vídeo?",
        "Sim. Todas as aulas têm texto e uma atividade prática. Ativa a poupança de dados para dar prioridade à leitura. Os vídeos só carregam quando escolhes reproduzir.",
      ],
      [
        "Os pagamentos são reais?",
        "Não. O checkout permite experimentar os estados de um pagamento. Nenhuma carteira móvel é contactada e nunca pedimos um PIN.",
      ],
      [
        "Onde ficam os meus dados?",
        "Apenas no armazenamento local deste navegador. Exporta uma cópia nas definições antes de limpar os dados do navegador. Os vídeos e as fontes externas precisam de internet.",
      ],
      [
        "O certificado tem validade académica?",
        "Não. É uma demonstração do fluxo de conclusão. O código é consultado apenas neste navegador.",
      ],
      [
        "O apoio envia mensagens para uma equipa?",
        "Não nesta versão. O pedido fica guardado localmente e pode ser respondido no painel Gestão · demo.",
      ],
    ];
  return `${heading("Estamos aqui para ajudar", "Respostas simples para continuares a aprender.")}<div class="page-grid"><section class="panel faq"><h2>Perguntas frequentes</h2>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}<h3 class="mt">Os teus pedidos locais</h3>${s.tickets.map((t) => `<article class="post"><div class="split"><strong>${e(t.subject)}</strong><span class="badge ${t.status === "resolved" ? "success" : "warning"}">${t.status === "resolved" ? "Respondido" : "Aberto"}</span></div><p>${e(t.message)}</p>${t.reply ? `<div class="info-box"><b>Resposta da gestão demo</b><br>${e(t.reply)}</div>` : ""}</article>`).join("") || '<p style="font-size:12px">Ainda não criaste nenhum pedido.</p>'}</section><aside class="panel" style="align-self:start"><h3>Cria um pedido de apoio</h3><form data-form="ticket">${field("Assunto", "subject", "", "text", 'required maxlength="150"')}${textarea("Como podemos ajudar?", "message", "", 'required maxlength="3000"')}<button class="btn block" type="submit">Guardar pedido local ${icon("arrow")}</button></form><p style="font-size:10px;margin:16px 0 0">Demonstração. Não será enviada nenhuma mensagem externa.</p></aside></div>`;
}
export function admin() {
  const s = getState(),
    net = s.orders
      .filter((o) => o.status === "confirmed")
      .reduce((n, o) => n + o.amount, 0);
  return `${heading("Nos bastidores da Kuvona", "Gere o catálogo e experimenta os fluxos operacionais.", button(icon("plus") + " Novo curso", "course-new"))}<div class="info-box warning">Gestão de demonstração, acessível a qualquer pessoa neste navegador. A autenticação e as permissões reais exigem servidor.</div><div class="admin-metrics">${stat("book", "Cursos publicados", s.catalog.length)}${stat("users", "Inscrições locais", s.enrollments.length)}${stat("wallet", "Receita simulada líquida", net ? money(net) : "0 MT")}${stat("clock", "Pedidos pendentes", s.orders.filter((o) => o.status === "pending").length)}</div><div class="tabs admin-tabs">${[
    ["catalog", "Catálogo"],
    ["payments", "Pagamentos"],
    ["support", "Apoio"],
    ["activity", "Atividade"],
  ]
    .map(
      ([key, label]) =>
        `<button class="tab ${ui.adminTab === key ? "active" : ""}" data-action="admin-tab" data-value="${key}">${label}</button>`,
    )
    .join(
      "",
    )}</div>${ui.adminTab === "payments" ? payments(true) : ui.adminTab === "activity" ? `<div class="panel">${activity()}</div>` : ui.adminTab === "support" ? `<div class="stack">${s.tickets.map((t) => `<section class="panel"><div class="split"><h3>${e(t.subject)}</h3><span class="badge">${t.status === "resolved" ? "Respondido" : "Aberto"}</span></div><p style="font-size:12px;white-space:pre-wrap">${e(t.message)}</p><form data-form="ticket-reply" data-id="${t.id}">${textarea("Resposta local", "reply", t.reply, 'required maxlength="3000"')}<button class="btn small" type="submit">Guardar resposta</button></form></section>`).join("") || empty("Sem pedidos de apoio", "Os pedidos criados no Centro de ajuda aparecerão aqui.", "", "message")}</div>` : `<div class="table-wrap"><table><thead><tr><th>Curso</th><th>Área</th><th>Aulas</th><th>Preço demo</th><th>Gerir</th></tr></thead><tbody>${s.catalog.map((c) => `<tr><td><a class="table-title" href="#course/${c.id}"><b>${e(c.title)}</b></a><small>${e(c.instructor)}</small></td><td>${e(c.category)}</td><td>${c.lessons.length}</td><td>${money(c.price)}</td><td><div class="table-actions">${button("Editar curso", "course-edit", `data-id="${c.id}"`, "small secondary")}${button("Aulas", "lesson-editor-list", `data-id="${c.id}"`, "small secondary")}${button("Avaliação", "quiz-editor-list", `data-id="${c.id}"`, "small secondary")}${button("Materiais", "resource-editor-list", `data-id="${c.id}"`, "small secondary")}</div></td></tr>`).join("")}</tbody></table></div><div class="info-box">Ao criar um curso, inclui uma aula e uma pergunta de avaliação. Podes acrescentar aulas e editar o conteúdo a seguir.</div>`}`;
}
export function activity() {
  return (
    getState()
      .activity.map(
        (a) =>
          `<div class="activity-row">${icon("check")}<div>${e(a.text)}<small>${date(a.at, { hour: "2-digit", minute: "2-digit" })}</small></div></div>`,
      )
      .join("") ||
    '<p style="font-size:12px">As tuas próximas atividades aparecerão aqui.</p>'
  );
}
