import test from "node:test";
import assert from "node:assert/strict";
import { seedCourses } from "../src/data.js";
import {
  initialState,
  normalizeState,
  normalizeCourse,
  transitionPayment,
  grade,
  eligible,
  youtubeID,
  escapeHTML,
} from "../src/domain.js";
import { permittedPath } from "../server.mjs";

function orderState() {
  const s = initialState(seedCourses);
  s.orders.push({
    id: "pay-test",
    courseId: "business",
    courseTitle: "Negócios",
    amount: 150000,
    method: "M-Pesa",
    status: "pending",
    history: [{ status: "pending", at: "2026-10-22" }],
  });
  return s;
}
test("all seed courses have usable lessons and valid assessments", () => {
  for (const c of seedCourses)
    assert.equal(normalizeCourse(c).lessons.length, c.lessons.length);
});
test("confirmation atomically grants one enrollment and is idempotent", () => {
  const original = orderState(),
    confirmed = transitionPayment(original, "pay-test", "confirmed");
  assert.equal(original.orders[0].status, "pending");
  assert.equal(original.enrollments.includes("business"), false);
  assert.equal(confirmed.orders[0].status, "confirmed");
  assert.equal(confirmed.enrollments.filter((c) => c === "business").length, 1);
  assert.equal(
    transitionPayment(confirmed, "pay-test", "confirmed"),
    confirmed,
  );
  assert.equal(confirmed.orders[0].history.length, 2);
});
test("failed, cancelled and expired requests cannot grant enrollment or later confirm", () => {
  for (const status of ["failed", "cancelled", "expired"]) {
    const s = transitionPayment(orderState(), "pay-test", status);
    assert.equal(s.enrollments.includes("business"), false);
    assert.throws(() => transitionPayment(s, "pay-test", "confirmed"));
  }
});
test("refund revokes unsupported enrollment while preserving learning records", () => {
  const s = transitionPayment(orderState(), "pay-test", "confirmed");
  s.progress.business = ["biz-1"];
  const refunded = transitionPayment(s, "pay-test", "refunded");
  assert.equal(refunded.enrollments.includes("business"), false);
  assert.deepEqual(refunded.progress.business, ["biz-1"]);
  assert.throws(() => transitionPayment(refunded, "pay-test", "confirmed"));
});
test("another confirmed order preserves enrollment on refund", () => {
  const s = transitionPayment(orderState(), "pay-test", "confirmed");
  s.orders.push({ ...s.orders[0], id: "pay-other" });
  assert.equal(
    transitionPayment(s, "pay-test", "refunded").enrollments.includes(
      "business",
    ),
    true,
  );
});
test("certificates require enrollment, all lessons and passing score", () => {
  const s = initialState(seedCourses),
    c = s.catalog[0];
  s.assessments.web = { score: 100 };
  assert.equal(eligible(s, c), false);
  s.progress.web = c.lessons.map((l) => l.id);
  assert.equal(eligible(s, c), true);
  s.assessments.web.score = 67;
  assert.equal(eligible(s, c), false);
  s.assessments.web.score = 100;
  s.enrollments = [];
  assert.equal(eligible(s, c), false);
});
test("assessment grades answers and rejects incomplete or invalid answers", () => {
  const c = seedCourses[0];
  assert.equal(grade(c, [0, 1, 2]).score, 100);
  assert.equal(grade(c, [0, 1, 0]).score, 67);
  for (const input of [[0], [0, 1, 9], [0, 1, NaN]])
    assert.throws(() => grade(c, input));
});
test("restore recomputes scores rather than trusting imported pass flags", () => {
  const s = initialState(seedCourses);
  s.progress.web = s.catalog[0].lessons.map((l) => l.id);
  s.assessments.web = { score: 100, answers: [2, 2, 0], at: "today" };
  s.certificates.web = { id: "KV-fake", at: "today", name: "A" };
  const restored = normalizeState(s, seedCourses);
  assert.equal(restored.assessments.web.score, 0);
  assert.equal(restored.certificates.web, undefined);
});
test("restore round-trip keeps notes, course prices and payment history", () => {
  const s = transitionPayment(orderState(), "pay-test", "confirmed");
  s.notes["web-1"] = "A minha ideia <script>segura</script>";
  const restored = normalizeState(JSON.parse(JSON.stringify(s)), seedCourses);
  assert.equal(restored.notes["web-1"], s.notes["web-1"]);
  assert.equal(restored.orders[0].amount, 150000);
  assert.equal(restored.catalog[1].price, 150000);
});
test("restore rejects malformed prices, repeated IDs and unsafe keys", () => {
  const s = initialState(seedCourses);
  s.catalog[0].price = 1.5;
  assert.throws(() => normalizeState(s, seedCourses));
  const repeated = initialState(seedCourses);
  repeated.catalog.push(repeated.catalog[0]);
  assert.throws(() => normalizeState(repeated, seedCourses));
  const unsafe = initialState(seedCourses);
  unsafe.catalog[0].id = "__proto__";
  assert.throws(() => normalizeState(unsafe, seedCourses));
  assert.throws(() => normalizeState({ version: 1 }, seedCourses));
});
test("YouTube parser accepts known hosts only and refuses executable URLs", () => {
  assert.equal(
    youtubeID("https://www.youtube.com/watch?v=Ejkb_YpuHWs"),
    "Ejkb_YpuHWs",
  );
  assert.equal(youtubeID("https://youtu.be/Ejkb_YpuHWs"), "Ejkb_YpuHWs");
  assert.equal(
    youtubeID("https://youtube.com/shorts/Ejkb_YpuHWs"),
    "Ejkb_YpuHWs",
  );
  for (const s of [
    "javascript:alert(1)",
    "https://evil.com/watch?v=Ejkb_YpuHWs",
    "https://youtube.com.evil.com/watch?v=Ejkb_YpuHWs",
    "<iframe>",
  ])
    assert.equal(youtubeID(s), null);
  assert.equal(
    escapeHTML('<img onerror="x">'),
    "&lt;img onerror=&quot;x&quot;&gt;",
  );
});
test("static server does not expose instructions, private files or traversal paths", () => {
  assert.equal(permittedPath("/src/app.js"), "src/app.js");
  for (const p of [
    "/int.txt",
    "/AGENTS.md",
    "/.env",
    "/.git/config",
    "/src/%2e%2e/README.md",
    "/src/..%5cint.txt",
    "/%E0%A4%A",
  ])
    assert.equal(permittedPath(p), null);
});
