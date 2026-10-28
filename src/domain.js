export const VERSION = 2;
export const PASS_SCORE = 70;
export const PAYMENT_STATUSES = [
  "pending",
  "confirmed",
  "failed",
  "cancelled",
  "expired",
  "refunded",
];
export const colors = ["sage", "clay", "lavender", "sky"];
export const id = (prefix = "item") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
export const money = (cents) =>
  cents === 0
    ? "Gratuito"
    : new Intl.NumberFormat("pt-MZ", {
        minimumFractionDigits: cents % 100 ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(cents / 100) + " MT";
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function youtubeID(value) {
  if (/^[A-Za-z0-9_-]{11}$/.test(value || "")) return value;
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (
      ![
        "youtube.com",
        "m.youtube.com",
        "youtu.be",
        "youtube-nocookie.com",
      ].includes(host)
    )
      return null;
    const candidate =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ||
          u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
    return /^[A-Za-z0-9_-]{11}$/.test(candidate || "") ? candidate : null;
  } catch {
    return null;
  }
}
const text = (value, max = 500) =>
  typeof value === "string" ? value.slice(0, max) : "";
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const safeKey = (x) =>
  typeof x === "string" &&
  /^[a-zA-Z0-9_-]{1,90}$/.test(x) &&
  !["__proto__", "constructor", "prototype"].includes(x);
const strings = (v, max = 100) =>
  Array.isArray(v) ? [...new Set(v.filter(safeKey))].slice(0, max) : [];
export const courseProgress = (state, course) => {
  const done = course.lessons.filter((l) =>
    state.progress[course.id]?.includes(l.id),
  ).length;
  return {
    done,
    total: course.lessons.length,
    percent: course.lessons.length
      ? Math.round((done / course.lessons.length) * 100)
      : 0,
  };
};
export const eligible = (state, course) =>
  state.enrollments.includes(course.id) &&
  course.lessons.length > 0 &&
  courseProgress(state, course).percent === 100 &&
  (state.assessments[course.id]?.score ?? -1) >= PASS_SCORE;
export function grade(course, answers) {
  if (
    !course.quiz?.length ||
    answers.length !== course.quiz.length ||
    answers.some(
      (a, i) =>
        !Number.isInteger(a) || a < 0 || a >= course.quiz[i].options.length,
    )
  )
    throw Error("Responde a todas as perguntas.");
  const correct = course.quiz.filter((q, i) => q.correct === answers[i]).length;
  return {
    correct,
    total: course.quiz.length,
    score: Math.round((correct / course.quiz.length) * 100),
  };
}
export function transitionPayment(
  state,
  orderId,
  nextStatus,
  at = new Date().toISOString(),
) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) throw Error("Pagamento não encontrado.");
  if (order.status === nextStatus) return state; // Provider duplicates are idempotent.
  const allowed = {
    pending: ["confirmed", "failed", "cancelled", "expired"],
    confirmed: ["refunded"],
  };
  if (!allowed[order.status]?.includes(nextStatus))
    throw Error("Esta transição de pagamento não é permitida.");
  const next = structuredClone(state);
  const target = next.orders.find((o) => o.id === orderId);
  target.status = nextStatus;
  target.updatedAt = at;
  target.history.push({ status: nextStatus, at });
  if (nextStatus === "confirmed" && !next.enrollments.includes(target.courseId))
    next.enrollments.push(target.courseId);
  if (nextStatus === "refunded") {
    const course = next.catalog.find((c) => c.id === target.courseId);
    const other = next.orders.some(
      (o) =>
        o.id !== orderId &&
        o.courseId === target.courseId &&
        o.status === "confirmed",
    );
    if (course?.price > 0 && !other)
      next.enrollments = next.enrollments.filter((c) => c !== target.courseId);
  }
  next.activity.unshift({
    id: id("event"),
    text: `${nextStatus === "confirmed" ? "Inscrição confirmada" : nextStatus === "refunded" ? "Reembolso simulado" : "Pagamento atualizado"} · ${target.courseTitle}`,
    at,
  });
  next.activity = next.activity.slice(0, 100);
  return next;
}

export function normalizeCourse(value) {
  if (
    !object(value) ||
    !safeKey(value.id) ||
    !text(value.title).trim() ||
    !Number.isSafeInteger(value.price) ||
    value.price < 0 ||
    value.price > 100000000
  )
    throw Error("Curso inválido.");
  if (
    !Array.isArray(value.lessons) ||
    !value.lessons.length ||
    value.lessons.length > 60
  )
    throw Error("O curso precisa de 1 a 60 aulas.");
  const lessons = value.lessons.map((l, i) => {
    if (
      !object(l) ||
      !safeKey(l.id) ||
      !text(l.title).trim() ||
      !Array.isArray(l.content) ||
      !l.content.some((p) => text(p).trim())
    )
      throw Error("Conteúdo da aula inválido.");
    const video = l.video ? youtubeID(l.video) : null;
    if (l.video && !video) throw Error("Vídeo YouTube inválido.");
    return {
      id: l.id,
      title: text(l.title, 140).trim(),
      module: text(l.module, 80) || `Módulo ${i + 1}`,
      minutes: Math.max(1, Math.min(240, Number(l.minutes) || 10)),
      content: l.content.slice(0, 30).map((p) => text(p, 10000)),
      task: text(l.task, 3000),
      ...(video
        ? { video, source: text(l.source, 150) || "Vídeo indicado pela equipa" }
        : {}),
    };
  });
  if (new Set(lessons.map((l) => l.id)).size !== lessons.length)
    throw Error("IDs de aula repetidos.");
  if (
    !Array.isArray(value.quiz) ||
    !value.quiz.length ||
    value.quiz.length > 20
  )
    throw Error("Adiciona pelo menos uma pergunta de avaliação.");
  const quiz = value.quiz.map((q) => {
    if (
      !object(q) ||
      !text(q.question).trim() ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 6 ||
      q.options.some((o) => !text(o).trim()) ||
      !Number.isInteger(q.correct) ||
      q.correct < 0 ||
      q.correct >= q.options.length
    )
      throw Error("Avaliação inválida.");
    return {
      question: text(q.question, 500),
      options: q.options.map((o) => text(o, 400)),
      correct: q.correct,
      explanation: text(q.explanation, 1000),
    };
  });
  return {
    id: value.id,
    title: text(value.title, 140).trim(),
    subtitle: text(value.subtitle, 160),
    description: text(value.description, 2000),
    category: text(value.category, 60) || "Geral",
    level: text(value.level, 40) || "Iniciante",
    price: value.price,
    color: colors.includes(value.color) ? value.color : "sage",
    symbol: text(value.symbol, 10) || "↗",
    instructor: text(value.instructor, 80) || "Equipa Kuvona",
    initials: text(value.initials, 3) || "KV",
    minutes: lessons.reduce((n, l) => n + l.minutes, 0),
    featured: value.featured === true,
    skills: Array.isArray(value.skills)
      ? value.skills.slice(0, 12).map((x) => text(x, 80))
      : [],
    requirements: Array.isArray(value.requirements)
      ? value.requirements.slice(0, 12).map((x) => text(x, 400))
      : [],
    audience: Array.isArray(value.audience)
      ? value.audience.slice(0, 12).map((x) => text(x, 400))
      : [],
    instructorBio: text(value.instructorBio, 2000),
    project: text(value.project, 1200),
    lessons,
    quiz,
    outcomes: Array.isArray(value.outcomes)
      ? value.outcomes.slice(0, 10).map((o) => text(o, 300))
      : [],
    resources: Array.isArray(value.resources)
      ? value.resources.slice(0, 10).map((r) => ({
          title: text(r.title, 120),
          text: text(r.text, 30000),
        }))
      : [],
  };
}

export function initialState(catalog) {
  return {
    version: VERSION,
    catalogRevision: 3,
    profile: { name: "Estudante", email: "", phone: "", bio: "" },
    preferences: { theme: "light", dataSaver: false, goal: 3 },
    catalog: structuredClone(catalog),
    enrollments: ["web"],
    favorites: [],
    reviews: [],
    progress: {},
    positions: {},
    notes: {},
    assessments: {},
    certificates: {},
    orders: [],
    schedule: [],
    discussions: [],
    tickets: [],
    activity: [],
    lastLesson: { courseId: "web", lessonId: "web-1" },
  };
}

// All imported state is projected onto a known schema. No arbitrary object merging.
export function normalizeState(raw, seed) {
  if (
    !object(raw) ||
    raw.version !== VERSION ||
    !Array.isArray(raw.catalog) ||
    !raw.catalog.length ||
    raw.catalog.length > 100
  )
    throw Error("Este ficheiro não é uma cópia Kuvona válida (versão 2).");
  const catalog = raw.catalog.map(normalizeCourse);
  const ids = catalog.map((c) => c.id);
  if (new Set(ids).size !== ids.length)
    throw Error("Cursos repetidos no ficheiro.");
  const allLessons = catalog.flatMap((c) => c.lessons.map((l) => l.id));
  if (new Set(allLessons).size !== allLessons.length)
    throw Error("As aulas precisam de IDs únicos.");
  const state = initialState(seed);
  state.catalog = catalog;
  state.catalogRevision = raw.catalogRevision === 3 ? 3 : 2;
  const p = object(raw.profile) ? raw.profile : {};
  state.profile = {
    name: text(p.name, 100).trim() || "Estudante",
    email: text(p.email, 150),
    phone: text(p.phone, 25),
    bio: text(p.bio, 500),
  };
  const prefs = object(raw.preferences) ? raw.preferences : {};
  state.preferences = {
    theme: prefs.theme === "dark" ? "dark" : "light",
    dataSaver: prefs.dataSaver === true,
    goal: Math.max(1, Math.min(7, Number(prefs.goal) || 3)),
  };
  state.enrollments = strings(raw.enrollments).filter((x) => ids.includes(x));
  state.favorites = strings(raw.favorites).filter((x) => ids.includes(x));
  if (Array.isArray(raw.reviews)) {
    const seen = new Set();
    state.reviews = raw.reviews
      .slice(0, 200)
      .filter((r) => {
        if (
          !object(r) ||
          !safeKey(r.id) ||
          !ids.includes(r.courseId) ||
          !Number.isInteger(r.rating) ||
          r.rating < 1 ||
          r.rating > 5 ||
          !text(r.text).trim() ||
          seen.has(r.courseId)
        )
          return false;
        seen.add(r.courseId);
        return true;
      })
      .map((r) => ({
        id: r.id,
        courseId: r.courseId,
        rating: r.rating,
        text: text(r.text, 2000),
        name: text(r.name, 100),
        at: text(r.at, 40),
      }));
  }
  for (const c of catalog) {
    state.progress[c.id] = strings(raw.progress?.[c.id]).filter((x) =>
      c.lessons.some((l) => l.id === x),
    );
    for (const l of c.lessons) {
      const note = raw.notes?.[l.id];
      if (typeof note === "string") state.notes[l.id] = text(note, 20000);
      const position = Number(raw.positions?.[l.id]);
      if (Number.isFinite(position) && position >= 0)
        state.positions[l.id] = Math.min(position, 86400);
    }
    const a = raw.assessments?.[c.id];
    if (object(a) && Array.isArray(a.answers)) {
      try {
        const result = grade(c, a.answers);
        state.assessments[c.id] = {
          ...result,
          answers: a.answers,
          at: text(a.at, 40),
        };
      } catch {
        /* Ignore invalid attempts. */
      }
    }
  }
  if (Array.isArray(raw.orders))
    state.orders = raw.orders.slice(0, 500).map((o) => {
      if (
        !object(o) ||
        !safeKey(o.id) ||
        !ids.includes(o.courseId) ||
        !Number.isSafeInteger(o.amount) ||
        o.amount < 0 ||
        o.amount > 100000000 ||
        !PAYMENT_STATUSES.includes(o.status)
      )
        throw Error("Transação inválida no ficheiro.");
      return {
        id: o.id,
        courseId: o.courseId,
        courseTitle: text(o.courseTitle, 140),
        amount: o.amount,
        method: ["M-Pesa", "e-Mola"].includes(o.method) ? o.method : "M-Pesa",
        phone: text(o.phone, 25),
        status: o.status,
        createdAt: text(o.createdAt, 40),
        updatedAt: text(o.updatedAt, 40),
        history: Array.isArray(o.history)
          ? o.history
              .filter((h) => PAYMENT_STATUSES.includes(h.status))
              .slice(0, 10)
              .map((h) => ({ status: h.status, at: text(h.at, 40) }))
          : [],
      };
    });
  if (new Set(state.orders.map((o) => o.id)).size !== state.orders.length)
    throw Error("Transações repetidas.");
  if (Array.isArray(raw.schedule))
    state.schedule = raw.schedule
      .slice(0, 200)
      .filter(
        (x) =>
          object(x) &&
          safeKey(x.id) &&
          ids.includes(x.courseId) &&
          /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
          /^\d{2}:\d{2}$/.test(x.time),
      )
      .map((x) => ({
        id: x.id,
        courseId: x.courseId,
        date: x.date,
        time: x.time,
        minutes: Math.max(5, Math.min(180, Number(x.minutes) || 25)),
        done: x.done === true,
      }));
  if (Array.isArray(raw.discussions))
    state.discussions = raw.discussions
      .slice(0, 200)
      .filter((x) => object(x) && safeKey(x.id) && ids.includes(x.courseId))
      .map((x) => ({
        id: x.id,
        courseId: x.courseId,
        text: text(x.text, 3000),
        name: text(x.name, 100),
        at: text(x.at, 40),
      }));
  if (Array.isArray(raw.tickets))
    state.tickets = raw.tickets
      .slice(0, 100)
      .filter((x) => object(x) && safeKey(x.id))
      .map((x) => ({
        id: x.id,
        subject: text(x.subject, 150),
        message: text(x.message, 3000),
        at: text(x.at, 40),
        status: x.status === "resolved" ? "resolved" : "open",
        reply: text(x.reply, 3000),
      }));
  if (Array.isArray(raw.activity))
    state.activity = raw.activity
      .slice(0, 100)
      .filter(object)
      .map((x) => ({
        id: safeKey(x.id) ? x.id : id("event"),
        text: text(x.text, 300),
        at: text(x.at, 40),
      }));
  if (
    object(raw.lastLesson) &&
    catalog.some(
      (c) =>
        c.id === raw.lastLesson.courseId &&
        c.lessons.some((l) => l.id === raw.lastLesson.lessonId),
    )
  )
    state.lastLesson = {
      courseId: raw.lastLesson.courseId,
      lessonId: raw.lastLesson.lessonId,
    };
  for (const c of catalog) {
    if (eligible(state, c) && object(raw.certificates?.[c.id])) {
      const cert = raw.certificates[c.id];
      if (safeKey(cert.id))
        state.certificates[c.id] = {
          id: cert.id,
          at: text(cert.at, 40),
          name: text(cert.name, 100) || state.profile.name,
        };
    }
  }
  return state;
}
export function upgradeCatalog(state, seed) {
  if (state.catalogRevision === 3) return state;
  const next = structuredClone(state);
  for (const item of seed) {
    const existing = next.catalog.find((c) => c.id === item.id);
    if (!existing) next.catalog.push(normalizeCourse(item));
    else {
      for (const key of ["skills", "requirements", "audience"])
        if (!existing[key]?.length)
          existing[key] = structuredClone(item[key] || []);
      for (const key of ["instructorBio", "project"])
        if (!existing[key]) existing[key] = item[key] || "";
    }
  }
  next.catalogRevision = 3;
  return next;
}
export function reviewSummary(state, courseId) {
  const reviews = (state.reviews || []).filter((r) => r.courseId === courseId);
  return {
    count: reviews.length,
    average: reviews.length
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    })),
  };
}
