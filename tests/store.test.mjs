import test from "node:test";
import assert from "node:assert/strict";
const memory = new Map([
  [
    "kuvona-demo",
    JSON.stringify({
      completed: [0, 0, 2, 99],
      enrolled: [0, 1],
      notes: { 0: "Anotação antiga" },
    }),
  ],
]);
globalThis.localStorage = {
  getItem: (k) => memory.get(k) || null,
  setItem: (k, v) => memory.set(k, v),
};
const { getState, dispatch, getStorageStatus } = await import(
  "../src/store.js"
);
const act = (type, data = {}) => dispatch(type, data, false);
test("migration preserves original progress and existing paid demo access", () => {
  assert.deepEqual(getState().progress.web, ["web-1", "web-3"]);
  assert.equal(getState().notes["web-1"], "Anotação antiga");
  assert.equal(getState().enrollments.includes("business"), true);
});
test("checkout uses catalog amount, masks phone and reuses pending request", () => {
  act("reset");
  const order = act("order", {
    courseId: "business",
    method: "M-Pesa",
    phone: "841234567",
    amount: 1,
  });
  assert.equal(getState().orders[0].amount, 150000);
  assert.equal(getState().orders[0].phone, "84•••••67");
  assert.equal(
    act("order", {
      courseId: "business",
      method: "e-Mola",
      phone: "861234567",
    }),
    order,
  );
  assert.equal(getState().orders.length, 1);
  assert.equal(getState().enrollments.includes("business"), false);
  act("payment", { orderId: order, status: "confirmed" });
  assert.equal(getState().enrollments.includes("business"), true);
});
test("invalid phone and unpaid direct enrollment are rejected", () => {
  act("reset");
  assert.throws(() => act("enroll", { courseId: "business" }));
  assert.throws(() =>
    act("order", { courseId: "business", method: "M-Pesa", phone: "123" }),
  );
  assert.equal(getState().orders.length, 0);
});
test("assessment is locked until all lessons and creates certificate after pass", () => {
  act("reset");
  assert.throws(() =>
    act("assessment", { courseId: "web", answers: [0, 1, 2] }),
  );
  for (const l of getState().catalog[0].lessons)
    act("lesson", { courseId: "web", lessonId: l.id });
  assert.equal(getState().certificates.web, undefined);
  act("profile", { name: "Ana Teste" });
  act("assessment", { courseId: "web", answers: [0, 1, 2] });
  assert.ok(getState().certificates.web.id);
  assert.equal(getState().certificates.web.name, "Ana Teste");
  act("assessment", { courseId: "web", answers: [2, 2, 0] });
  assert.equal(getState().assessments.web.score, 100);
});
test("metadata changes preserve qualifications; assessment changes invalidate them", () => {
  const c = structuredClone(getState().catalog[0]);
  c.title = "Novo título";
  act("course-save", { course: c });
  assert.ok(getState().certificates.web);
  c.quiz[0].question = "Pergunta nova";
  act("course-save", { course: c });
  assert.equal(getState().certificates.web, undefined);
});
test("unavailable storage keeps the application usable and reports the limitation", () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  act("profile", { name: "Offline" });
  assert.equal(getState().profile.name, "Offline");
  assert.equal(getStorageStatus().ok, false);
  localStorage.setItem = original;
  act("profile", { name: "Estudante" });
  assert.equal(getStorageStatus().ok, true);
});
test("a course review requires enrollment and study and edits the existing opinion", () => {
  act("reset");
  assert.throws(() =>
    act("review", {
      courseId: "business",
      rating: 5,
      text: "Uma opinião real de teste.",
    }),
  );
  assert.throws(() =>
    act("review", {
      courseId: "web",
      rating: 5,
      text: "Uma opinião real de teste.",
    }),
  );
  act("lesson", { courseId: "web", lessonId: "web-1" });
  act("review", {
    courseId: "web",
    rating: 4,
    text: "Aprendi a organizar a minha página.",
  });
  act("review", {
    courseId: "web",
    rating: 5,
    text: "Voltei a praticar e atualizei a minha opinião.",
  });
  assert.equal(getState().reviews.length, 1);
  assert.equal(getState().reviews[0].rating, 5);
});
