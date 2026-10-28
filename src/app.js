import {
  escapeHTML as e,
  id,
  money,
  eligible,
  youtubeID,
  normalizeState,
} from "./domain.js";
import { getState, dispatch, getStorageStatus } from "./store.js";
import {
  icon,
  button,
  link,
  empty,
  date,
  field,
  textarea,
  learnURL,
  statusBadge,
  statusText,
  dateKey,
} from "./ui.js";
import * as views from "./views.js";
import { mountPlayer, destroyPlayer } from "./player.js";
import { seedCourses } from "./data.js";
import * as market from "./marketplace.js";

const $ = (selector) => document.querySelector(selector);
const modal = $("#modal");
const act = (action, data = {}) => dispatch(action, data, false);
let modalReturnFocus;
let menuReturnFocus;
let calendarCursor = 0;
let restoreCandidate;
let previewMode = false;
let checkoutIntent = null;
try {
  checkoutIntent = JSON.parse(
    sessionStorage.getItem("kuvona-checkout") || "null",
  );
} catch {}
export function toast(message, error = false) {
  const el = document.createElement("div");
  el.className = "toast" + (error ? " error" : "");
  el.textContent = message;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 5000);
}
function route() {
  return (location.hash.slice(1) || "home").split("/");
}
function go(target) {
  if (location.hash === "#" + target) render();
  else location.hash = target;
}
function render({ preserveFocus = false } = {}) {
  const focus = preserveFocus && document.activeElement?.id;
  const selection = focus && document.activeElement.selectionStart;
  destroyPlayer();
  const s = getState(),
    [page, cid, lid] = route(),
    c = s.catalog.find((c) => c.id === cid);
  document.documentElement.dataset.theme = s.preferences.theme;
  let content;
  const publicPage = market.publicRoutes.includes(page);
  if (publicPage) {
    const missing = () =>
      `<div class="market-container market-section">${empty("Não encontrámos este curso", "Explora o catálogo para escolher um novo percurso.", link("Ver cursos", "catalog"))}</div>`;
    const screens = {
      home: market.home,
      catalog: () => market.catalog(),
      favorites: () => market.catalog(true),
      course: () => (c ? market.detail(c) : missing()),
      instructor: () => market.instructor(cid),
      checkout: () =>
        c
          ? market.checkout(
              c,
              checkoutIntent?.courseId === c.id &&
                Date.now() - checkoutIntent.at < 1800000,
            )
          : missing(),
      purchase: () => market.purchase(cid, cid === "free" ? lid : undefined),
      about: market.about,
      teach: market.teach,
    };
    content = screens[page]();
  } else if (["learn", "assessment"].includes(page)) {
    if (!c)
      content = empty(
        "Não encontrámos este curso",
        "O link pode estar desatualizado.",
        link("Explorar catálogo", "catalog"),
      );
    else if (!s.enrollments.includes(c.id))
      content = empty(
        "O teu lugar neste percurso espera por ti",
        "Inscreve-te para estudar as aulas, guardar anotações e acompanhar o progresso.",
        link("Ver curso", `course/${c.id}`),
        "lock",
      );
    else if (page === "assessment") content = views.assessment(c);
    else {
      const l = c.lessons.find((l) => l.id === lid) || c.lessons[0];
      content = views.learning(c, l);
    }
  } else {
    const screens = {
      dashboard: views.dashboard,
      courses: () => views.listing("courses"),
      catalog: () => views.listing(),
      favorites: () => views.listing("favorites"),
      planner: views.planner,
      certificates: views.certificates,
      payments: views.payments,
      settings: views.settings,
      help: views.help,
      admin: views.admin,
    };
    content = (screens[page] || views.dashboard)();
  }
  $("#app").innerHTML = publicPage
    ? market.shell(content, page)
    : views.shell(content);
  syncSidebar();
  document.title = `${market.marketTitles[page] || views.titles[page] || "Academia"} · Academia Kuvona`;
  if (focus) {
    const input = document.getElementById(focus);
    input?.focus();
    try {
      input?.setSelectionRange(selection, selection);
    } catch {}
  }
}
const mobileQuery = matchMedia("(max-width:700px)");
function syncSidebar() {
  const sidebar = $("#sidebar");
  if (sidebar)
    sidebar.inert = mobileQuery.matches && !sidebar.classList.contains("open");
}
mobileQuery.addEventListener("change", syncSidebar);
function showModal(title, content, wide = false) {
  if (!modal.open) modalReturnFocus = document.activeElement;
  modal.classList.toggle("wide", wide);
  modal.innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Fechar janela">${icon("close")}</button></div><div class="modal-body">${content}<p id="modal-error" class="error-message" role="alert" hidden></p></div>`;
  if (!modal.open) modal.showModal();
}
function closeModal() {
  if (previewMode) {
    destroyPlayer();
    previewMode = false;
  }
  modal.close();
  modalReturnFocus?.isConnected && modalReturnFocus.focus();
}
function confirmAction(title, message, action, data = "") {
  showModal(
    title,
    `<p>${message}</p><div class="modal-footer">${button("Cancelar", "close", "", "secondary")}${button("Confirmar", "" + action, data, "danger")}</div>`,
  );
}
function download(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function enroll(courseId) {
  const c = getState().catalog.find((c) => c.id === courseId);
  if (!c) return;
  if (route()[0] !== "course" || route()[1] !== courseId) {
    go(`course/${courseId}`);
    return;
  }
  if (getState().enrollments.includes(courseId)) {
    go(learnURL(c));
    return;
  }
  if (c.price === 0) {
    act("enroll", { courseId });
    toast("Inscrição gratuita concluída. Bom estudo!");
    go(`purchase/free/${c.id}`);
    return;
  }
  const pending = getState().orders.find(
    (o) => o.courseId === c.id && o.status === "pending",
  );
  if (pending) {
    go(`purchase/${pending.id}`);
    return;
  }
  checkoutIntent = { courseId: c.id, at: Date.now() };
  try {
    sessionStorage.setItem("kuvona-checkout", JSON.stringify(checkoutIntent));
  } catch {}
  go(`checkout/${c.id}`);
}
function coursePreview(cid) {
  const c = getState().catalog.find((c) => c.id === cid);
  if (!c) return;
  const lesson = c.lessons[0];
  previewMode = true;
  showModal(
    `Conhece o curso · ${e(c.title)}`,
    `<div class="preview-label">PRÉ-VISUALIZAÇÃO GRATUITA · PRIMEIRA AULA</div><div id="public-preview-player">${lesson.video ? `<div class="player-shell"><div class="player-placeholder"><button class="play" data-action="preview-play" data-id="${c.id}" aria-label="Carregar vídeo de pré-visualização">${icon("play")}</button><h3>${e(lesson.title)}</h3><p>O vídeo só carrega quando escolheres reproduzir.</p></div></div><div class="video-credit"><span>${e(lesson.source)}</span><a href="https://www.youtube.com/watch?v=${lesson.video}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a></div>` : ""}</div><article class="lesson-article preview-article"><h3>${e(lesson.title)}</h3>${lesson.content.map((p) => `<p>${e(p)}</p>`).join("")}<div class="practice"><span class="eyebrow">UMA PRIMEIRA EXPERIÊNCIA</span><p>${e(lesson.task)}</p></div></article><div class="info-box">Esta pré-visualização não cria uma inscrição nem altera o progresso.</div><div class="modal-footer">${button("Voltar aos detalhes", "close", "", "secondary")}</div>`,
    true,
  );
}
function courseReview(cid) {
  const previous = getState().reviews.find((r) => r.courseId === cid);
  showModal(
    "A tua experiência com o curso",
    `<form data-form="course-review" data-course="${cid}"><div class="field"><label for="rating">Como avaliaste o percurso?</label><select name="rating" id="rating" required><option value="">Seleciona uma classificação</option>${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${previous?.rating === n ? "selected" : ""}>${"★".repeat(n)} · ${n} de 5</option>`).join("")}</select></div>${textarea("O que aprendeste? O que poderia melhorar?", "review-text", previous?.text || "", 'required minlength="10" maxlength="2000"')}<div class="info-box">A tua opinião fica guardada apenas neste navegador. Conclui pelo menos uma aula antes de avaliar.</div><div class="modal-footer">${button("Cancelar", "close", "", "secondary")}<button class="btn" type="submit">Guardar avaliação</button></div></form>`,
  );
}
function orderDetails(orderId) {
  const o = getState().orders.find((o) => o.id === orderId);
  if (!o) return;
  const c = getState().catalog.find((c) => c.id === o.courseId),
    pending = o.status === "pending";
  showModal(
    "Detalhes do pagamento demo",
    `<div class="payment-status"><div class="status-icon">${icon(o.status === "confirmed" ? "check" : o.status === "pending" ? "clock" : "wallet")}</div>${statusBadge(o.status)}<h3 class="mt">${e(o.courseTitle)}</h3><p>${money(o.amount)} · ${e(o.method)} · ${e(o.phone)}</p></div>${pending ? `<div class="info-box">Experimenta o resultado do pedido. Fechar esta janela mantém o estado pendente, mesmo depois de atualizar a página.</div><div class="filters">${button("Simular confirmação", "resolve-payment", `data-id="${o.id}" data-status="confirmed"`)}${button("Simular falha", "resolve-payment", `data-id="${o.id}" data-status="failed"`, "secondary")}${button("Expirar", "resolve-payment", `data-id="${o.id}" data-status="expired"`, "secondary")}${button("Cancelar pedido", "resolve-payment", `data-id="${o.id}" data-status="cancelled"`, "danger")}</div>` : ""}<ul class="timeline">${o.history.map((h) => `<li>${statusText(h.status)}<small>${date(h.at, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></li>`).join("")}</ul><div class="info-box">Referência: ${e(o.id)}<br>Registo local demonstrativo. Não é uma fatura fiscal.</div><div class="modal-footer">${button("Exportar registo", "receipt", `data-id="${o.id}"`, "secondary")}${o.status === "confirmed" ? link("Ir para o curso " + icon("arrow"), learnURL(c)) : o.status !== "pending" && o.status !== "refunded" ? button("Nova tentativa", "retry-payment", `data-course="${o.courseId}"`) : ""}</div>`,
  );
}
function courseEditor(courseId) {
  const c = getState().catalog.find((c) => c.id === courseId);
  showModal(
    c ? "Editar curso" : "Publicar um novo percurso",
    `<form data-form="course-editor" data-id="${c?.id || ""}">${field("Título do curso", "title", c?.title || "", "text", 'required maxlength="140"')}${field("Subtítulo", "subtitle", c?.subtitle || "", "text", 'required maxlength="160"')}${textarea("Descrição", "description", c?.description || "", 'required maxlength="2000"')}<div class="field-row">${field("Área", "category", c?.category || "Tecnologia", "text", 'required maxlength="60"')}${field("Preço em MT · demo", "price", c ? c.price / 100 : 0, "number", 'min="0" max="1000000" step="0.01" required')}</div><div class="field-row"><div class="field"><label for="color">Cor da capa</label><select name="color" id="color">${[
      ["sage", "Sálvia"],
      ["clay", "Argila"],
      ["lavender", "Lavanda"],
      ["sky", "Céu"],
    ]
      .map(
        ([key, label]) =>
          `<option value="${key}" ${c?.color === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div>${field("Símbolo da capa", "symbol", c?.symbol || "↗", "text", 'maxlength="10"')}</div>${field("Equipa / instrutor", "instructor", c?.instructor || "Equipa Kuvona", "text", 'required maxlength="80"')}${textarea("O que o estudante vai aprender (uma linha por objetivo)", "outcomes", c?.outcomes.join("\n") || "", 'required maxlength="3000"')}${textarea("Requisitos (uma linha por requisito)", "requirements", c?.requirements?.join("\n") || "", 'maxlength="4000"')}${textarea("Para quem é o curso (uma linha por público)", "audience", c?.audience?.join("\n") || "", 'maxlength="4000"')}${field("Competências (separadas por vírgula)", "skills", c?.skills?.join(", ") || "", "text", 'maxlength="900"')}${textarea("Projeto prático do curso", "project", c?.project || "", 'maxlength="1200"')}${textarea("Apresentação da equipa / instrutor", "instructorBio", c?.instructorBio || "", 'maxlength="2000"')}${!c ? `<h3>Primeira aula</h3>${field("Título da aula", "lessonTitle", "", "text", 'required maxlength="140"')}${textarea("Conteúdo da aula (separa os parágrafos com uma linha vazia)", "lessonContent", "", 'required maxlength="10000"')}${field("Exercício prático", "lessonTask", "", "text", 'required maxlength="1000"')}<h3>Avaliação inicial</h3>${field("Pergunta", "question", "", "text", 'required maxlength="500"')}${field("Resposta correta", "correct", "", "text", 'required maxlength="400"')}${field("Alternativa 2", "option2", "", "text", 'required maxlength="400"')}${field("Alternativa 3", "option3", "", "text", 'required maxlength="400"')}` : '<div class="info-box">A edição dos dados do curso preserva as aulas e os materiais. Edita as aulas na opção “Aulas” do painel.</div>'}<div class="modal-footer">${button("Cancelar", "close", "", "secondary")}<button type="submit" class="btn">${c ? "Guardar alterações" : "Publicar na demo"} ${icon("check")}</button></div></form>`,
    true,
  );
}
function lessonListEditor(cid) {
  const c = getState().catalog.find((c) => c.id === cid);
  showModal(
    "Aulas · " + e(c.title),
    `<div class="stack">${c.lessons.map((l, i) => `<div class="resource"><strong>${i + 1}. ${e(l.title)}</strong>${button("Editar", "lesson-edit", `data-course="${c.id}" data-lesson="${l.id}"`, "small secondary")}</div>`).join("")}</div><div class="modal-footer">${button(icon("plus") + " Acrescentar aula", "lesson-add", `data-course="${c.id}"`)}</div>`,
  );
}
function assessmentEditor(cid, index) {
  const c = getState().catalog.find((c) => c.id === cid),
    q = c.quiz[index];
  showModal(
    q ? "Editar pergunta" : "Nova pergunta",
    `<form data-form="quiz-editor" data-course="${cid}" data-index="${index}">${field("Pergunta", "question", q?.question || "", "text", 'required maxlength="500"')}${textarea("Opções (uma por linha, entre 2 e 6)", "options", q?.options.join("\n") || "", 'required maxlength="2400"')}${field("Número da resposta correta (primeira opção = 1)", "correct", (q?.correct ?? 0) + 1, "number", 'required min="1" max="6"')}${textarea("Explicação da resposta", "explanation", q?.explanation || "", 'required maxlength="1000"')}<div class="info-box warning">Alterar a avaliação reinicia o resultado e o certificado deste curso na demonstração. O progresso das aulas é preservado.</div><div class="modal-footer">${button("Cancelar", "close", "", "secondary")}<button class="btn" type="submit">Guardar pergunta</button></div></form>`,
  );
}
function quizListEditor(cid) {
  const c = getState().catalog.find((c) => c.id === cid);
  showModal(
    "Avaliação · " + e(c.title),
    `${c.quiz.map((q, i) => `<div class="resource"><strong>${i + 1}. ${e(q.question)}</strong>${button("Editar", "quiz-edit", `data-course="${cid}" data-index="${i}"`, "small secondary")}</div>`).join("")}<div class="modal-footer">${button(icon("plus") + " Nova pergunta", "quiz-edit", `data-course="${cid}" data-index="-1"`)}</div>`,
  );
}
function resourceEditor(cid, index) {
  const c = getState().catalog.find((c) => c.id === cid),
    r = c.resources[index];
  showModal(
    r ? "Editar material" : "Novo material de apoio",
    `<form data-form="resource-editor" data-course="${cid}" data-index="${index}">${field("Nome do material", "title", r?.title || "", "text", 'required maxlength="120"')}${textarea("Conteúdo do ficheiro de texto", "text", r?.text || "", 'required maxlength="30000"')}<div class="modal-footer">${button("Cancelar", "close", "", "secondary")}<button class="btn" type="submit">Guardar material</button></div></form>`,
  );
}
function resourceListEditor(cid) {
  const c = getState().catalog.find((c) => c.id === cid);
  showModal(
    "Materiais · " + e(c.title),
    `${c.resources.map((r, i) => `<div class="resource"><strong>${e(r.title)}</strong>${button("Editar", "resource-edit", `data-course="${cid}" data-index="${i}"`, "small secondary")}</div>`).join("") || "<p>Ainda não há materiais neste curso.</p>"}<div class="modal-footer">${button(icon("plus") + " Novo material", "resource-edit", `data-course="${cid}" data-index="-1"`)}</div>`,
  );
}
function lessonEditor(cid, lid) {
  const c = getState().catalog.find((c) => c.id === cid),
    l = c.lessons.find((l) => l.id === lid);
  showModal(
    l ? "Editar aula" : "Acrescentar aula",
    `<form data-form="lesson-editor" data-course="${cid}" data-lesson="${l?.id || ""}">${field("Título", "title", l?.title || "", "text", 'required maxlength="140"')}${!l ? field("Módulo", "module", "Novo módulo", "text", 'required maxlength="80"') : ""}${field("Vídeo YouTube (opcional)", "video", l?.video || "", "text", 'placeholder="Link ou ID do vídeo" maxlength="300"')}${field("Autor / fonte do vídeo", "source", l?.source || "", "text", 'maxlength="150"')}${textarea("Conteúdo (uma linha vazia entre parágrafos)", "content", l?.content.join("\n\n") || "", 'required maxlength="30000"')}${textarea("Exercício prático", "task", l?.task || "", 'required maxlength="3000"')}<div class="modal-footer">${button("Cancelar", "close", "", "secondary")}<button type="submit" class="btn">Guardar aula ${icon("check")}</button></div></form>`,
    true,
  );
}
function certificateModal(cid) {
  const s = getState(),
    c = s.catalog.find((c) => c.id === cid);
  if (!c || !eligible(s, c))
    throw Error("Conclui o curso e a avaliação para obter o certificado.");
  const cert = s.certificates[c.id];
  if (!cert) throw Error("O registo do certificado ainda não está disponível.");
  showModal(
    "A tua conquista",
    `<div class="certificate-preview"><div class="cert-brand">kuvona ✳</div><span class="eyebrow">ACADEMIA DIGITAL</span><h2>Certificado de conclusão</h2><p>Reconhecemos o percurso de</p><h3>${e(cert.name)}</h3><p>pela conclusão das aulas e avaliação de</p><h3>${e(c.title)}</h3><p>${c.lessons.length} aulas · ${c.minutes} minutos estimados · avaliação ${s.assessments[c.id].score}%</p><p>${date(cert.at, { year: "numeric", month: "long" })}</p><span class="cert-id">${e(cert.id)}<br>DEMONSTRAÇÃO · SEM VALIDADE ACADÉMICA</span></div><div class="modal-footer">${button(icon("download") + " Descarregar SVG", "certificate-download", `data-id="${cid}"`)}${button("Imprimir / PDF", "print", "", "secondary")}</div>`,
    true,
  );
}
function certificateDownload(cid) {
  const s = getState(),
    c = s.catalog.find((c) => c.id === cid),
    cert = s.certificates[cid];
  if (!c || !cert || !eligible(s, c)) throw Error("Certificado indisponível.");
  const lines = c.title.match(/.{1,38}(?:\s|$)|.{1,38}/g) || [c.title];
  download(
    `kuvona-certificado-${cid}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850"><rect width="1200" height="850" fill="#fcfbf2"/><rect x="25" y="25" width="1150" height="800" rx="4" fill="none" stroke="#a1b182" stroke-width="2"/><rect x="35" y="35" width="1130" height="780" fill="none" stroke="#a1b182"/><g text-anchor="middle" fill="#254532" font-family="Georgia,serif"><text x="600" y="125" font-size="38" font-weight="bold">kuvona ✳</text><text x="600" y="220" font-size="46">Certificado de conclusão</text><text x="600" y="290" font-size="20">Reconhecemos o percurso de</text><text x="600" y="355" font-size="38">${e(cert.name)}</text><text x="600" y="415" font-size="20">pela conclusão das aulas e avaliação de</text>${lines
      .slice(0, 4)
      .map(
        (t, i) =>
          `<text x="600" y="${475 + i * 42}" font-size="30">${e(t.trim())}</text>`,
      )
      .join(
        "",
      )}<text x="600" y="680" font-size="17">${date(cert.at, { year: "numeric", month: "long" })} · ${c.lessons.length} aulas · ${s.assessments[cid].score}% na avaliação</text><text x="600" y="738" font-size="12">${e(cert.id)}</text><text x="600" y="775" font-size="13">DEMONSTRAÇÃO — SEM VALIDADE ACADÉMICA</text></g></svg>`,
    "image/svg+xml",
  );
}
function play(cid, lid) {
  const c = getState().catalog.find((c) => c.id === cid),
    l = c?.lessons.find((l) => l.id === lid);
  if (!l?.video || !getState().enrollments.includes(cid)) return;
  $("#player-shell").classList.remove("data-saving");
  $("#player-shell").innerHTML = '<div id="youtube-player"></div>';
  mountPlayer({
    element: $("#youtube-player"),
    video: l.video,
    seconds: getState().positions[l.id] || 0,
    onPosition: (seconds) =>
      act("position", { courseId: cid, lessonId: lid, seconds }),
    onEnd: () => {
      act("lesson", { courseId: cid, lessonId: lid });
      toast("Vídeo terminado. Aula marcada como concluída.");
      updateLessonProgress(cid, lid);
    },
    onError: (message) => {
      $("#player-shell").innerHTML =
        `<div class="player-placeholder"><h3>Não foi possível abrir o vídeo</h3><p>${e(message)}</p><a class="btn lime" href="https://www.youtube.com/watch?v=${l.video}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a></div>`;
    },
  });
}
function updateLessonProgress(cid, lid) {
  const c = getState().catalog.find((c) => c.id === cid),
    l = c.lessons.find((l) => l.id === lid);
  const temp = document.createElement("div");
  temp.innerHTML = views.learning(c, l);
  $(".lesson-sidebar")?.replaceWith(temp.querySelector(".lesson-sidebar"));
  $(".lesson-actions")?.replaceWith(temp.querySelector(".lesson-actions"));
}

document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor?.classList.contains("skip-link")) {
    event.preventDefault();
    $("#main")?.focus();
    return;
  }
  if (
    anchor &&
    ["#catalog", "#favorites"].includes(anchor.getAttribute("href"))
  )
    Object.assign(market.marketUI, {
      search: "",
      category: "Todos",
      price: "all",
      level: "all",
      duration: "all",
      page: 1,
    });
  if (anchor && modal.open) closeModal();
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const { action, id: ref, course: cid, lesson: lid, value } = el.dataset;
  try {
    switch (action) {
      case "menu": {
        const open = !$("#sidebar").classList.contains("open");
        $("#sidebar").classList.toggle("open", open);
        $("#menu-scrim").classList.toggle("open", open);
        $(".mobile-menu")?.setAttribute("aria-expanded", String(open));
        syncSidebar();
        if (open) {
          menuReturnFocus = document.activeElement;
          $("#sidebar a").focus();
        } else menuReturnFocus?.focus();
        break;
      }
      case "market-open":
        if (!event.target.closest("a,button")) go(`course/${ref}`);
        break;
      case "market-category":
        if (!el.closest(".catalog-filters"))
          Object.assign(market.marketUI, {
            search: "",
            price: "all",
            level: "all",
            duration: "all",
          });
        market.marketUI.category = value;
        market.marketUI.page = 1;
        go("catalog");
        break;
      case "market-skill":
        Object.assign(market.marketUI, {
          search: value,
          category: "Todos",
          page: 1,
          price: "all",
        });
        go("catalog");
        break;
      case "market-free":
        Object.assign(market.marketUI, {
          search: "",
          category: "Todos",
          price: "free",
          page: 1,
        });
        go("catalog");
        break;
      case "market-clear":
        Object.assign(market.marketUI, {
          search: "",
          category: "Todos",
          level: "all",
          duration: "all",
          price: "all",
          page: 1,
        });
        render();
        break;
      case "market-layout":
        market.marketUI.layout = value;
        render();
        break;
      case "market-page":
        market.marketUI.page = Math.max(1, Number(value));
        render();
        document
          .querySelector(".catalog-controls")
          ?.scrollIntoView({ block: "start" });
        break;
      case "course-section":
        document
          .getElementById("course-" + value)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "curriculum-expand": {
        const all = [...document.querySelectorAll(".store-curriculum details")],
          open = all.some((d) => !d.open);
        all.forEach((d) => (d.open = open));
        el.textContent = open
          ? "Recolher todas as secções"
          : "Expandir todas as secções";
        break;
      }
      case "course-preview":
        coursePreview(ref);
        break;
      case "preview-play": {
        const c = getState().catalog.find((c) => c.id === ref),
          lesson = c?.lessons[0];
        if (!lesson?.video) break;
        $("#public-preview-player").innerHTML =
          '<div class="player-shell"><div id="public-preview-video"></div></div>';
        mountPlayer({
          element: $("#public-preview-video"),
          video: lesson.video,
          onPosition: () => {},
          onEnd: () => {},
          onError: (message) => {
            if ($("#public-preview-player"))
              $("#public-preview-player").innerHTML =
                `<div class="info-box">${e(message)} <a href="https://www.youtube.com/watch?v=${lesson.video}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a></div>`;
          },
        });
        break;
      }
      case "course-review":
        courseReview(ref);
        break;
      case "share-course": {
        const url = location.href.split("#")[0] + "#course/" + ref;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard
            .writeText(url)
            .then(() => toast("Link do curso copiado."))
            .catch(() =>
              showModal(
                "Partilhar curso",
                field("Copia este link", "share-url", url, "text", "readonly"),
              ),
            );
        } else
          showModal(
            "Partilhar curso",
            field("Copia este link", "share-url", url, "text", "readonly"),
          );
        break;
      }
      case "theme":
        act("preferences", {
          theme: getState().preferences.theme === "dark" ? "light" : "dark",
        });
        document.documentElement.dataset.theme = getState().preferences.theme;
        break;
      case "favorite":
        act("favorite", { courseId: ref });
        render();
        break;
      case "category":
        views.ui.category = value;
        render();
        break;
      case "clear-filters":
        Object.assign(views.ui, {
          category: "Todos",
          search: "",
          price: "all",
          courseStatus: "all",
        });
        render();
        break;
      case "calendar":
        calendarCursor += Number(el.dataset.delta);
        views.ui.monthOffset = calendarCursor;
        render();
        break;
      case "enroll":
        enroll(ref);
        break;
      case "close":
        closeModal();
        break;
      case "play":
        play(cid, lid);
        break;
      case "complete":
        act("lesson", { courseId: cid, lessonId: lid });
        updateLessonProgress(cid, lid);
        toast("Progresso guardado. Mais um passo em frente!");
        break;
      case "lesson-tab": {
        views.ui.lessonTab = value;
        const c = getState().catalog.find((c) => c.id === route()[1]),
          l = c.lessons.find((l) => l.id === route()[2]) || c.lessons[0];
        $("#lesson-tab-content").innerHTML = views.lessonContent(c, l);
        document.querySelectorAll('[data-action="lesson-tab"]').forEach((b) => {
          b.classList.toggle("active", b.dataset.value === value);
          b.setAttribute("aria-selected", String(b.dataset.value === value));
        });
        break;
      }
      case "resource": {
        const c = getState().catalog.find((c) => c.id === cid),
          r = c.resources[Number(el.dataset.index)];
        download(`kuvona-${cid}-material.txt`, r.text);
        break;
      }
      case "export-notes": {
        const c = getState().catalog.find((c) => c.id === cid),
          s = getState();
        download(
          `kuvona-${cid}-anotacoes.txt`,
          `${c.title}\n${"=".repeat(40)}\n\n` +
            c.lessons
              .map((l) => `${l.title}\n${s.notes[l.id] || "(Sem anotações)"}\n`)
              .join("\n"),
        );
        break;
      }
      case "quiz-retry":
        views.ui.result = null;
        render();
        break;
      case "session-toggle":
        act("session-toggle", { id: ref });
        render();
        break;
      case "session-remove":
        confirmAction(
          "Eliminar sessão?",
          "Esta sessão será removida da tua agenda.",
          "session-remove-confirm",
          `data-id="${ref}"`,
        );
        break;
      case "session-remove-confirm":
        act("session-remove", { id: ref });
        closeModal();
        render();
        toast("Sessão eliminada.");
        break;
      case "calendar-export": {
        const x = getState().schedule.find((x) => x.id === ref),
          c = getState().catalog.find((c) => c.id === x.courseId),
          start = new Date(`${x.date}T${x.time}:00`),
          end = new Date(start.getTime() + x.minutes * 60000),
          format = (d) =>
            d
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(/\.\d{3}/, "");
        download(
          "kuvona-estudo.ics",
          `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Kuvona//Estudos//PT\r\nBEGIN:VEVENT\r\nUID:${x.id}@kuvona.local\r\nDTSTAMP:${format(new Date())}\r\nDTSTART:${format(start)}\r\nDTEND:${format(end)}\r\nSUMMARY:Estudar - ${c.title.replace(/[\r\n,;\\]/g, " ")}\r\nDESCRIPTION:Sessao de aprendizagem Kuvona\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
          "text/calendar",
        );
        break;
      }
      case "order-details":
        orderDetails(ref);
        break;
      case "resolve-payment":
        act("payment", { orderId: ref, status: el.dataset.status });
        render();
        if (route()[0] !== "purchase") orderDetails(ref);
        toast("Estado do pagamento simulado atualizado.");
        break;
      case "retry-payment":
        closeModal();
        go(`course/${cid}`);
        break;
      case "receipt": {
        const o = getState().orders.find((o) => o.id === ref);
        download(
          `kuvona-${o.id}.json`,
          JSON.stringify(
            { notice: "REGISTO DEMONSTRATIVO. NÃO É FATURA.", ...o },
            null,
            2,
          ),
          "application/json",
        );
        break;
      }
      case "refund":
        confirmAction(
          "Simular reembolso?",
          "O pagamento ficará reembolsado e o acesso demonstrativo será revogado. O progresso fica preservado.",
          "refund-confirm",
          `data-id="${ref}"`,
        );
        break;
      case "refund-confirm":
        act("payment", { orderId: ref, status: "refunded" });
        closeModal();
        render();
        toast("Reembolso simulado. Acesso atualizado.");
        break;
      case "certificate":
        certificateModal(ref);
        break;
      case "certificate-download":
        certificateDownload(ref);
        break;
      case "print":
        window.print();
        break;
      case "verify":
        showModal(
          "Consultar certificado neste navegador",
          `<p>A consulta verifica apenas os registos locais desta demonstração.</p><form data-form="verify">${field("Código do certificado", "code", "", "text", 'required maxlength="100"')}<button class="btn" type="submit">Consultar</button><div id="verification-result" class="mt" role="status"></div></form>`,
        );
        break;
      case "notifications":
        showModal("A tua atividade", views.activity());
        break;
      case "admin-tab":
        views.ui.adminTab = value;
        render();
        break;
      case "course-new":
        courseEditor();
        break;
      case "course-edit":
        courseEditor(ref);
        break;
      case "lesson-editor-list":
        lessonListEditor(ref);
        break;
      case "lesson-edit":
        lessonEditor(cid, lid);
        break;
      case "lesson-add":
        lessonEditor(cid);
        break;
      case "quiz-editor-list":
        quizListEditor(ref);
        break;
      case "quiz-edit":
        assessmentEditor(cid, Number(el.dataset.index));
        break;
      case "resource-editor-list":
        resourceListEditor(ref);
        break;
      case "resource-edit":
        resourceEditor(cid, Number(el.dataset.index));
        break;
      case "backup":
        download(
          `kuvona-copia-${dateKey()}.json`,
          JSON.stringify(getState(), null, 2),
          "application/json",
        );
        toast("Cópia exportada. Guarda-a num local seguro.");
        break;
      case "import":
        $("#import-file").click();
        break;
      case "restore-confirm":
        act("restore", { state: restoreCandidate });
        restoreCandidate = null;
        closeModal();
        render();
        toast("Cópia importada com sucesso.");
        break;
      case "reset":
        confirmAction(
          "Repor a demonstração?",
          "Isto apaga os dados atuais da Kuvona neste navegador. Exporta uma cópia primeiro, se quiseres conservar o progresso.",
          "reset-confirm",
        );
        break;
      case "reset-confirm":
        act("reset");
        closeModal();
        go("dashboard");
        toast("Demonstração reposta.");
        break;
    }
  } catch (error) {
    toast(error.message, true);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form)),
    kind = form.dataset.form,
    s = getState();
  try {
    switch (kind) {
      case "market-search":
      case "global-search":
        Object.assign(market.marketUI, {
          search: data.q.trim(),
          category: "Todos",
          price: "all",
          page: 1,
        });
        go("catalog");
        break;
      case "course-review":
        act("review", {
          courseId: form.dataset.course,
          rating: Number(data.rating),
          text: data["review-text"],
        });
        closeModal();
        render();
        toast("A tua avaliação foi guardada.");
        document
          .getElementById("course-reviews")
          ?.scrollIntoView({ block: "start" });
        break;
      case "teach-proposal":
        act("ticket", {
          subject: "Proposta de curso: " + data.topic,
          message: `Nome: ${data.name}\nEmail: ${data.email}\n\n${data.proposal}`,
        });
        showModal(
          "A tua proposta ficou guardada",
          `<p>A proposta “${e(data.topic)}” está no apoio local da demonstração. Podes consultá-la no Centro de ajuda; não foi enviada nenhuma mensagem externa.</p><div class="modal-footer">${link("Ver proposta no meu espaço", "help")}${button("Fechar", "close", "", "secondary")}</div>`,
        );
        form.reset();
        break;
      case "profile":
        act("profile", data);
        render();
        toast("Perfil atualizado.");
        break;
      case "checkout": {
        if (
          route()[0] !== "checkout" ||
          checkoutIntent?.courseId !== form.dataset.course
        )
          throw Error("Começa pela página de detalhes do curso.");
        act("profile", {
          ...s.profile,
          name: data["student-name"],
          email: data["student-email"],
        });
        const orderId = act("order", {
          courseId: form.dataset.course,
          method: data.method,
          phone: data["payment-phone"],
        });
        checkoutIntent = null;
        try {
          sessionStorage.removeItem("kuvona-checkout");
        } catch {}
        go(`purchase/${orderId}`);
        break;
      }
      case "assessment": {
        const c = s.catalog.find((c) => c.id === form.dataset.course),
          answers = c.quiz.map((_, i) => Number(data["q" + i])),
          result = act("assessment", { courseId: c.id, answers });
        views.ui.result = { ...result, answers, courseId: c.id };
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      }
      case "schedule": {
        const at = new Date(`${data.date}T${data.time}:00`);
        if (!Number.isFinite(at.getTime()) || at < new Date())
          throw Error("Escolhe uma sessão no futuro.");
        act("schedule", data);
        render();
        toast("Sessão agendada.");
        break;
      }
      case "discussion":
        act("discussion", {
          courseId: form.dataset.course,
          text: data.message,
        });
        $("#lesson-tab-content").innerHTML = views.lessonContent(
          s.catalog.find((c) => c.id === form.dataset.course),
          s.catalog.find((c) => c.id === form.dataset.course).lessons[0],
        );
        toast("Mensagem guardada neste espaço.");
        break;
      case "ticket":
        act("ticket", data);
        render();
        toast("Pedido guardado no apoio local.");
        break;
      case "ticket-reply":
        act("ticket-reply", { id: form.dataset.id, reply: data.reply });
        render();
        toast("Resposta guardada.");
        break;
      case "verify": {
        const c = s.catalog.find(
          (c) =>
            s.certificates[c.id]?.id === data.code.trim() && eligible(s, c),
        );
        $("#verification-result").innerHTML = c
          ? `<div class="info-box"><b>Registo local encontrado ✓</b><br>${e(s.certificates[c.id].name)}<br>${e(c.title)}<br>Certificado demonstrativo.</div>`
          : '<p class="error-message">Não encontrámos um certificado elegível com esse código neste navegador.</p>';
        break;
      }
      case "course-editor": {
        const previous = s.catalog.find((c) => c.id === form.dataset.id),
          cid = previous?.id || id("course");
        const c = previous
          ? structuredClone(previous)
          : {
              id: cid,
              level: "Iniciante",
              initials: "KV",
              resources: [],
              lessons: [
                {
                  id: id("lesson"),
                  title: data.lessonTitle,
                  module: "01 · Começar",
                  minutes: 10,
                  content: data.lessonContent.split(/\n\s*\n/).filter(Boolean),
                  task: data.lessonTask,
                },
              ],
              quiz: [
                {
                  question: data.question,
                  options: [data.correct, data.option2, data.option3],
                  correct: 0,
                  explanation: "Revê o conteúdo da aula para aprofundar.",
                },
              ],
            };
        const amount = Math.round(Number(data.price) * 100);
        Object.assign(c, {
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          category: data.category,
          price: amount,
          color: data.color,
          symbol: data.symbol,
          instructor: data.instructor,
          outcomes: data.outcomes.split("\n").filter(Boolean),
          requirements: (data.requirements || "").split("\n").filter(Boolean),
          audience: (data.audience || "").split("\n").filter(Boolean),
          skills: (data.skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          project: data.project || "",
          instructorBio: data.instructorBio || "",
        });
        act("course-save", { course: c });
        views.ui.adminTab = "catalog";
        closeModal();
        render();
        toast("Curso publicado no catálogo local.");
        break;
      }
      case "lesson-editor": {
        const c = s.catalog.find((c) => c.id === form.dataset.course);
        if (form.dataset.lesson) {
          act("lesson-edit", {
            ...data,
            courseId: c.id,
            lessonId: form.dataset.lesson,
          });
        } else {
          const updated = structuredClone(c),
            video = data.video ? youtubeID(data.video) : null;
          if (data.video && !video) throw Error("Link YouTube inválido.");
          updated.lessons.push({
            id: id("lesson"),
            title: data.title,
            module: data.module,
            minutes: 10,
            content: data.content.split(/\n\s*\n/).filter(Boolean),
            task: data.task,
            ...(video ? { video, source: data.source } : {}),
          });
          act("course-save", { course: updated });
        }
        closeModal();
        render();
        toast("Aula guardada.");
        break;
      }
      case "quiz-editor": {
        const c = structuredClone(
            s.catalog.find((c) => c.id === form.dataset.course),
          ),
          index = Number(form.dataset.index),
          q = {
            question: data.question,
            options: data.options
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
            correct: Number(data.correct) - 1,
            explanation: data.explanation,
          };
        if (index < 0) c.quiz.push(q);
        else c.quiz[index] = q;
        act("course-save", { course: c });
        closeModal();
        render();
        toast("Avaliação atualizada.");
        break;
      }
      case "resource-editor": {
        const c = structuredClone(
            s.catalog.find((c) => c.id === form.dataset.course),
          ),
          index = Number(form.dataset.index),
          r = { title: data.title, text: data.text };
        if (index < 0) c.resources.push(r);
        else c.resources[index] = r;
        act("course-save", { course: c });
        closeModal();
        render();
        toast("Material de apoio guardado.");
        break;
      }
    }
  } catch (error) {
    if (modal.open) {
      $("#modal-error").hidden = false;
      $("#modal-error").textContent = error.message;
    } else if (kind === "checkout" && $("#checkout-error")) {
      $("#checkout-error").hidden = false;
      $("#checkout-error").textContent = error.message;
    } else toast(error.message, true);
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "catalog-search") {
    if (market.publicRoutes.includes(route()[0])) {
      market.marketUI.search = el.value;
      market.marketUI.page = 1;
    } else views.ui.search = el.value;
    render({ preserveFocus: true });
  }
  if (el.id === "lesson-notes") {
    act("notes", {
      courseId: el.dataset.course,
      lessonId: el.dataset.lesson,
      text: el.value,
    });
    $("#note-status").textContent = getStorageStatus().ok
      ? "Anotações guardadas."
      : "Não foi possível guardar. Exporta as anotações.";
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  try {
    if (el.name === "market-price") {
      market.marketUI.price = el.value;
      market.marketUI.page = 1;
      render();
      return;
    }
    switch (el.id) {
      case "market-sort":
        market.marketUI.sort = el.value;
        market.marketUI.page = 1;
        render();
        break;
      case "market-level":
        market.marketUI.level = el.value;
        market.marketUI.page = 1;
        render();
        break;
      case "market-duration":
        market.marketUI.duration = el.value;
        market.marketUI.page = 1;
        render();
        break;
      case "price-filter":
        views.ui.price = el.value;
        render();
        break;
      case "sort-filter":
        views.ui.sort = el.value;
        render();
        break;
      case "status-filter":
        views.ui.courseStatus = el.value;
        render();
        break;
      case "dark-toggle":
        act("preferences", { theme: el.checked ? "dark" : "light" });
        document.documentElement.dataset.theme = getState().preferences.theme;
        break;
      case "data-toggle":
        act("preferences", { dataSaver: el.checked });
        toast(
          el.checked ? "Poupança de dados ativa." : "Preferência atualizada.",
        );
        break;
      case "goal-select":
        act("preferences", { goal: Number(el.value) });
        toast("Meta semanal atualizada.");
        break;
      case "import-file": {
        const file = el.files[0];
        if (!file) return;
        if (file.size > 3000000) throw Error("A cópia deve ter menos de 3 MB.");
        restoreCandidate = normalizeState(
          JSON.parse(await file.text()),
          seedCourses,
        );
        confirmAction(
          "Substituir os dados atuais?",
          `A cópia contém ${restoreCandidate.catalog.length} cursos e ${restoreCandidate.enrollments.length} inscrições. Os dados atuais serão substituídos. Exporta uma cópia antes de continuar.`,
          "restore-confirm",
        );
        el.value = "";
        break;
      }
    }
  } catch (error) {
    toast(error.message, true);
    if (el.type === "file") el.value = "";
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    const input = $(".market-search input") || $(".top-search input");
    if (input && getComputedStyle(input.closest("form")).display !== "none")
      input.focus();
    else {
      go("catalog");
      setTimeout(() => $("#catalog-search")?.focus(), 0);
    }
  }
  if (event.key === "Escape" && $("#sidebar")?.classList.contains("open")) {
    $('[data-action="menu"]').click();
  }
  if (event.key === "Tab" && $("#sidebar")?.classList.contains("open")) {
    const links = [...$("#sidebar").querySelectorAll("a,button")],
      first = links[0],
      last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (
    event.target.matches('[role="tab"]') &&
    ["ArrowRight", "ArrowLeft"].includes(event.key)
  ) {
    const tabs = [
        ...event.target.parentElement.querySelectorAll('[role="tab"]'),
      ],
      index = tabs.indexOf(event.target),
      next =
        tabs[
          (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
            tabs.length
        ];
    event.preventDefault();
    next.click();
    next.focus();
  }
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeModal();
  }
});
modal.addEventListener("close", () => {
  if (previewMode) {
    destroyPlayer();
    previewMode = false;
  }
});
document.addEventListener(
  "toggle",
  (event) => {
    if (
      event.target.matches?.(".catalog-filters details") &&
      matchMedia("(max-width:560px)").matches
    )
      market.marketUI.filtersOpen = event.target.open;
  },
  true,
);
window.addEventListener("hashchange", () => {
  if (modal.open) closeModal();
  views.ui.result = null;
  views.ui.lessonTab = "overview";
  render();
  window.scrollTo(0, 0);
  $("#main")?.focus({ preventScroll: true });
});
window.addEventListener("storage", (event) => {
  if (event.key === "kuvona-v2")
    toast(
      "Os dados mudaram noutra aba. Atualiza esta página antes de continuar.",
    );
});
render();
