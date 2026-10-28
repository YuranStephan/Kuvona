import { seedCourses } from "./data.js";
import {
  initialState,
  normalizeState,
  normalizeCourse,
  transitionPayment,
  eligible,
  grade,
  id,
  youtubeID,
  upgradeCatalog,
} from "./domain.js";

const KEY = "kuvona-v2";
let storageOK = true;
let loadWarning = "";
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw)
      return upgradeCatalog(
        normalizeState(JSON.parse(raw), seedCourses),
        seedCourses,
      );
    const state = initialState(seedCourses);
    const old = JSON.parse(localStorage.getItem("kuvona-demo") || "null");
    if (old) {
      state.progress.web = Array.isArray(old.completed)
        ? [
            ...new Set(
              old.completed
                .filter((n) => Number.isInteger(n) && n >= 0 && n < 4)
                .map((n) => `web-${n + 1}`),
            ),
          ]
        : [];
      if (Array.isArray(old.enrolled))
        old.enrolled.forEach((n) => {
          const c = ["web", "business", "design"][n];
          if (c && !state.enrollments.includes(c)) state.enrollments.push(c);
        });
      if (old.notes && typeof old.notes === "object")
        for (let n = 0; n < 4; n++)
          if (typeof old.notes[n] === "string")
            state.notes[`web-${n + 1}`] = old.notes[n].slice(0, 20000);
      state.activity.push({
        id: id("event"),
        text: "O teu progresso anterior foi preservado na nova Kuvona.",
        at: new Date().toISOString(),
      });
    }
    if (localStorage.getItem("kuvona-theme") === "dark")
      state.preferences.theme = "dark";
    return state;
  } catch {
    loadWarning =
      "Não foi possível ler os dados guardados. A sessão começou com os dados iniciais; o ficheiro original do navegador não foi alterado.";
    storageOK = false;
    return initialState(seedCourses);
  }
}
let state = load();
const subscribers = new Set();
export const getState = () => state;
export const getStorageStatus = () => ({ ok: storageOK, warning: loadWarning });
export const subscribe = (listener) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};
function commit(next, notify = true) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOK = true;
    loadWarning = "";
  } catch {
    storageOK = false;
    loadWarning =
      "O navegador não conseguiu guardar os dados. Exporta uma cópia nas definições.";
  }
  if (notify) subscribers.forEach((fn) => fn(state));
}
function log(next, message) {
  next.activity.unshift({
    id: id("event"),
    text: message,
    at: new Date().toISOString(),
  });
  next.activity = next.activity.slice(0, 100);
}
function certificates(next) {
  next.catalog.forEach((c) => {
    if (eligible(next, c) && !next.certificates[c.id])
      next.certificates[c.id] = {
        id: id("KV"),
        at: new Date().toISOString(),
        name: next.profile.name,
      };
  });
}
export function dispatch(action, data = {}, notify = true) {
  let next = structuredClone(state);
  const course = next.catalog.find((c) => c.id === data.courseId);
  switch (action) {
    case "profile":
      next.profile = {
        name: String(data.name).trim().slice(0, 100) || "Estudante",
        email: String(data.email || "").slice(0, 150),
        phone: String(data.phone || "").slice(0, 25),
        bio: String(data.bio || "").slice(0, 500),
      };
      break;
    case "preferences":
      next.preferences = {
        theme: data.theme ?? next.preferences.theme,
        dataSaver: data.dataSaver ?? next.preferences.dataSaver,
        goal: Math.max(
          1,
          Math.min(7, Number(data.goal ?? next.preferences.goal)),
        ),
      };
      break;
    case "favorite":
      if (!course) throw Error("Curso não encontrado.");
      next.favorites = next.favorites.includes(course.id)
        ? next.favorites.filter((x) => x !== course.id)
        : [...next.favorites, course.id];
      break;
    case "review": {
      if (
        !course ||
        !next.enrollments.includes(course.id) ||
        !next.progress[course.id]?.length
      )
        throw Error("Conclui pelo menos uma aula para avaliar o curso.");
      const rating = Number(data.rating),
        text = String(data.text || "").trim();
      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5 ||
        text.length < 10
      )
        throw Error(
          "Escolhe de 1 a 5 estrelas e escreve pelo menos 10 caracteres.",
        );
      const previous = next.reviews.find((r) => r.courseId === course.id);
      next.reviews = next.reviews.filter((r) => r.courseId !== course.id);
      next.reviews.unshift({
        id: previous?.id || id("review"),
        courseId: course.id,
        rating,
        text: text.slice(0, 2000),
        name: next.profile.name,
        at: new Date().toISOString(),
      });
      break;
    }
    case "enroll":
      if (!course || course.price !== 0)
        throw Error(
          "Este curso requer uma inscrição através do pagamento demonstrativo.",
        );
      if (!next.enrollments.includes(course.id)) {
        next.enrollments.push(course.id);
        log(next, `Inscrição gratuita · ${course.title}`);
      }
      break;
    case "order": {
      if (!course || course.price <= 0)
        throw Error("Curso inválido para pagamento.");
      if (next.enrollments.includes(course.id))
        throw Error("Já tens acesso a este curso.");
      const pending = next.orders.find(
        (o) => o.courseId === course.id && o.status === "pending",
      );
      if (pending) return pending.id;
      if (!["M-Pesa", "e-Mola"].includes(data.method))
        throw Error("Escolhe um método de pagamento.");
      const phone = String(data.phone).replace(/[ +]/g, "").replace(/^258/, "");
      if (!/^8[2-7]\d{7}$/.test(phone))
        throw Error("Usa um número moçambicano válido com 9 dígitos.");
      const at = new Date().toISOString();
      const order = {
        id: id("pay"),
        courseId: course.id,
        courseTitle: course.title,
        amount: course.price,
        method: data.method,
        phone: phone.slice(0, 2) + "•••••" + phone.slice(-2),
        status: "pending",
        createdAt: at,
        updatedAt: at,
        history: [{ status: "pending", at }],
      };
      next.orders.unshift(order);
      log(next, `Pedido de inscrição · ${course.title}`);
      commit(next, notify);
      return order.id;
    }
    case "payment":
      next = transitionPayment(next, data.orderId, data.status);
      break;
    case "lesson": {
      if (
        !course ||
        !next.enrollments.includes(course.id) ||
        !course.lessons.some((l) => l.id === data.lessonId)
      )
        throw Error("Inscreve-te para guardar o progresso.");
      const list = (next.progress[course.id] ||= []);
      if (!list.includes(data.lessonId)) {
        list.push(data.lessonId);
        log(
          next,
          `Aula concluída · ${course.lessons.find((l) => l.id === data.lessonId).title}`,
        );
      }
      next.lastLesson = { courseId: course.id, lessonId: data.lessonId };
      certificates(next);
      break;
    }
    case "position":
      if (
        course?.lessons.some((l) => l.id === data.lessonId) &&
        next.enrollments.includes(course.id)
      ) {
        next.positions[data.lessonId] = Math.max(
          0,
          Math.min(86400, Number(data.seconds) || 0),
        );
        next.lastLesson = { courseId: course.id, lessonId: data.lessonId };
      }
      break;
    case "notes":
      if (
        !course ||
        !next.enrollments.includes(course.id) ||
        !course.lessons.some((l) => l.id === data.lessonId)
      )
        throw Error("Aula inválida.");
      next.notes[data.lessonId] = String(data.text).slice(0, 20000);
      break;
    case "assessment": {
      if (
        !course ||
        !next.enrollments.includes(course.id) ||
        !course.lessons.every((l) => next.progress[course.id]?.includes(l.id))
      )
        throw Error("Conclui todas as aulas antes da avaliação.");
      const result = grade(course, data.answers);
      // A later practice attempt does not erase an earned pass.
      if (
        !next.assessments[course.id] ||
        result.score >= next.assessments[course.id].score
      )
        next.assessments[course.id] = {
          ...result,
          answers: data.answers,
          at: new Date().toISOString(),
        };
      log(next, `Avaliação · ${course.title} · ${result.score}%`);
      certificates(next);
      commit(next, notify);
      return result;
    }
    case "schedule":
      if (
        !course ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)
      )
        throw Error("Escolhe uma data e hora válidas.");
      next.schedule.push({
        id: id("session"),
        courseId: course.id,
        date: data.date,
        time: data.time,
        minutes: Math.max(5, Math.min(180, Number(data.minutes) || 25)),
        done: false,
      });
      log(next, `Sessão agendada · ${course.title}`);
      break;
    case "session-toggle": {
      const session = next.schedule.find((s) => s.id === data.id);
      if (session) session.done = !session.done;
      break;
    }
    case "session-remove":
      next.schedule = next.schedule.filter((s) => s.id !== data.id);
      break;
    case "discussion":
      if (
        !course ||
        !next.enrollments.includes(course.id) ||
        !String(data.text).trim()
      )
        throw Error("Escreve uma mensagem.");
      next.discussions.unshift({
        id: id("post"),
        courseId: course.id,
        text: String(data.text).trim().slice(0, 3000),
        name: next.profile.name,
        at: new Date().toISOString(),
      });
      break;
    case "ticket":
      if (!String(data.subject).trim() || !String(data.message).trim())
        throw Error("Preenche o assunto e a mensagem.");
      next.tickets.unshift({
        id: id("ticket"),
        subject: String(data.subject).trim().slice(0, 150),
        message: String(data.message).trim().slice(0, 3000),
        status: "open",
        reply: "",
        at: new Date().toISOString(),
      });
      log(next, "Pedido de apoio criado nesta demonstração.");
      break;
    case "ticket-reply": {
      const ticket = next.tickets.find((t) => t.id === data.id);
      if (ticket) {
        ticket.reply = String(data.reply).trim().slice(0, 3000);
        ticket.status = "resolved";
      }
      break;
    }
    case "course-save": {
      const item = normalizeCourse(data.course);
      const otherLessons = next.catalog
        .filter((c) => c.id !== item.id)
        .flatMap((c) => c.lessons.map((l) => l.id));
      if (item.lessons.some((l) => otherLessons.includes(l.id)))
        throw Error("Uma aula não pode partilhar o ID com outro curso.");
      const index = next.catalog.findIndex((c) => c.id === item.id);
      if (index < 0) next.catalog.push(item);
      else {
        const original = next.catalog[index];
        const changedRequirements =
          JSON.stringify(original.quiz) !== JSON.stringify(item.quiz) ||
          JSON.stringify(original.lessons.map((l) => l.id)) !==
            JSON.stringify(item.lessons.map((l) => l.id));
        next.catalog[index] = item;
        if (changedRequirements) {
          delete next.assessments[item.id];
          delete next.certificates[item.id];
        }
      }
      log(next, `Catálogo atualizado · ${item.title}`);
      break;
    }
    case "lesson-edit": {
      if (!course) throw Error("Curso não encontrado.");
      const lesson = course.lessons.find((l) => l.id === data.lessonId);
      if (!lesson) throw Error("Aula não encontrada.");
      const video = data.video ? youtubeID(data.video) : null;
      if (data.video && !video) throw Error("O link YouTube não é válido.");
      lesson.title = String(data.title).trim().slice(0, 140);
      lesson.content = String(data.content)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      lesson.task = String(data.task).slice(0, 3000);
      if (video) {
        lesson.video = video;
        lesson.source = String(
          data.source || "Vídeo indicado pela equipa",
        ).slice(0, 150);
      } else {
        delete lesson.video;
        delete lesson.source;
      }
      normalizeCourse(course);
      break;
    }
    case "restore":
      next = upgradeCatalog(
        normalizeState(data.state, seedCourses),
        seedCourses,
      );
      certificates(next);
      break;
    case "reset":
      next = initialState(seedCourses);
      break;
    default:
      throw Error("Ação desconhecida.");
  }
  commit(next, notify);
  return next;
}
