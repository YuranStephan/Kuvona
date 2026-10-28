import { escapeHTML as e, money, courseProgress } from "./domain.js";
import { getState } from "./store.js";
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  book: "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1z M12 5v15",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M16 8l-2 6-6 2 2-6z",
  calendar: "M4 5h16v16H4z M4 10h16 M8 2v5 M16 2v5 M8 14h2 M14 14h2 M8 17h2",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8 14l-2 8 6-3 6 3-2-8",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  wallet: "M3 5h16v4 M3 5v15h18V8H3 M16 12h5v5h-5z M3 5l13-3v3",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M9 3l-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-2 2 1 3-2-1-3 2-2-2-3-3-1-1-3z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3 M12 18h.01",
  shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
  search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M15 15l6 6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  chevron: "M9 5l7 7-7 7",
  check: "M5 12l4 4L19 6",
  play: "M8 4l13 8-13 8z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "M6 6l12 12 M18 6L6 18",
  plus: "M12 4v16 M4 12h16",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  edit: "M15 4l5 5 M3 21l5-1L21 7l-5-5L3 15z",
  trash: "M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  file: "M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8",
  users:
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 7 M19 14c3 1 3 4 3 7",
  chart: "M4 3v18h17 M8 16v-5 M13 16V7 M18 16v-9",
  external: "M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7",
  lock: "M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4",
  message: "M3 3h18v14H9l-6 5z",
  target:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 12h.01",
};
export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const button = (label, action, data = "", cls = "") =>
  `<button class="btn ${cls}" data-action="${action}" ${data}>${label}</button>`;
export const link = (label, href, cls = "") =>
  `<a class="btn ${cls}" href="#${href}">${label}</a>`;
export const heading = (title, subtitle = "", right = "") =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${right}</div>`;
export const empty = (title, subtitle, cta = "", type = "book") =>
  `<div class="empty"><div class="empty-icon">${icon(type)}</div><h3>${title}</h3><p>${subtitle}</p>${cta}</div>`;
export const progressBar = (value, label = "") =>
  `<div class="progress" role="progressbar" aria-label="${e(label || "Progresso")}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span style="width:${value}%"></span></div>`;
export function date(value, options = {}) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-MZ", {
        day: "numeric",
        month: "short",
        ...options,
      }).format(d);
}
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const nextLesson = (course) => {
  const s = getState();
  return (
    course.lessons.find((l) => !s.progress[course.id]?.includes(l.id)) ||
    course.lessons[0]
  );
};
export const learnURL = (course) =>
  `learn/${course.id}/${nextLesson(course).id}`;
export const statusText = (status) =>
  ({
    pending: "Pendente",
    confirmed: "Confirmado",
    failed: "Falhado",
    cancelled: "Cancelado",
    expired: "Expirado",
    refunded: "Reembolsado",
  })[status] || status;
export const statusBadge = (status) =>
  `<span class="badge ${status === "confirmed" ? "success" : status === "pending" ? "warning" : ["failed", "expired"].includes(status) ? "danger" : ""}">${e(statusText(status))}</span>`;
export function cover(c, detail = false) {
  return `<div class="course-cover ${c.color} ${detail ? "detail-cover" : ""}"><div class="cover-grid"></div><div class="cover-pattern"></div><span class="cover-symbol ${c.id === "web" ? "code" : ""}">${e(c.symbol)}</span><span class="cover-caption">${e(c.subtitle)}</span>${!detail ? `<span class="cover-label">${e(c.level)}</span>` : ""}<button class="favorite ${getState().favorites.includes(c.id) ? "selected" : ""}" data-action="favorite" data-id="${c.id}" aria-label="${getState().favorites.includes(c.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${e(c.title)}" aria-pressed="${getState().favorites.includes(c.id)}">${icon("heart")}</button></div>`;
}
export function courseCard(c) {
  const s = getState(),
    enrolled = s.enrollments.includes(c.id),
    p = courseProgress(s, c);
  return `<article class="course-card">${cover(c)}<div class="course-body"><div class="course-category"><span>${e(c.category)}</span>${enrolled ? "<span>INSCRITO</span>" : ""}</div><h3><a href="#course/${c.id}">${e(c.title)}</a></h3><p class="course-subtitle">${e(c.subtitle)}</p><div class="course-meta"><span>${icon("book")}${c.lessons.length} aulas</span><span>${icon("clock")}${c.minutes} min</span></div><div class="instructor"><span class="avatar">${e(c.initials)}</span>${e(c.instructor)}</div>${enrolled ? `${progressBar(p.percent, c.title)}<div class="progress-meta"><span>${p.done} de ${p.total} aulas</span><span>${p.percent}%</span></div>` : ""}<div class="course-footer"><span class="price">${enrolled ? (p.percent === 100 ? "Aulas concluídas" : "O teu percurso") : money(c.price)}</span>${link(enrolled ? "Continuar " + icon("arrow") : "Explorar " + icon("arrow"), enrolled ? learnURL(c) : `course/${c.id}`, "small " + (enrolled ? "" : "secondary"))}</div></div></article>`;
}
export function field(label, name, value = "", type = "text", extra = "") {
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${e(value)}" ${extra}></div>`;
}
export function textarea(label, name, value = "", extra = "") {
  return `<div class="field"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" ${extra}>${e(value)}</textarea></div>`;
}
export const heroArt = `<svg viewBox="0 0 260 230" aria-hidden="true"><g fill="none" stroke="#99b57d" stroke-width=".7" opacity=".35"><ellipse cx="130" cy="111" rx="105" ry="76" transform="rotate(-30 130 111)"/><ellipse cx="130" cy="111" rx="105" ry="76" transform="rotate(30 130 111)"/><ellipse cx="130" cy="111" rx="105" ry="76" transform="rotate(90 130 111)"/></g><path d="M58 70l75-27 78 29-79 29z" fill="#e1efb6"/><path d="M71 88v57l61 22 63-24V89l-63 23z" fill="#82a46b"/><path d="M132 112v55l63-24V89z" fill="#648859"/><path d="M58 70v16l74 27 79-28V72l-79 29z" fill="#c7dfa0"/><path d="M174 86v44" stroke="#f3edca" stroke-width="3"/><path d="M169 130h10l4 14h-18z" fill="#f3edca"/><path d="M65 158l67 25 67-24v13l-67 25-67-25z" fill="#d8e7bd"/><path d="M65 173l67 25 67-24v10l-67 25-67-25z" fill="#7d9a68"/><path d="M205 34l4 8 9 2-9 3-4 8-3-8-9-3 9-2z M43 114l2 5 6 2-6 2-2 5-2-5-5-2 5-2z" fill="#d9eea2"/></svg>`;
