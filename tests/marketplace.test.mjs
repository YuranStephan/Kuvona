import test from "node:test";
import assert from "node:assert/strict";
import { seedCourses } from "../src/data.js";
import {
  initialState,
  normalizeState,
  upgradeCatalog,
  reviewSummary,
} from "../src/domain.js";

test("catalog expansion preserves edited courses, enrollment and notes", () => {
  const before = initialState(seedCourses.slice(0, 4));
  before.catalogRevision = 2;
  before.catalog[0].title = "Título personalizado";
  before.notes["web-1"] = "O meu caderno";
  before.progress.web = ["web-1"];
  const upgraded = upgradeCatalog(before, seedCourses);
  assert.equal(upgraded.catalog.length, 8);
  assert.equal(before.catalog.length, 4);
  assert.equal(upgraded.catalog[0].title, "Título personalizado");
  assert.equal(upgraded.notes["web-1"], "O meu caderno");
  assert.deepEqual(upgraded.progress.web, ["web-1"]);
  assert.equal(upgradeCatalog(upgraded, seedCourses), upgraded);
});
test("storefront metadata survives backup round-trip", () => {
  const state = initialState(seedCourses),
    restored = normalizeState(JSON.parse(JSON.stringify(state)), seedCourses);
  for (const c of restored.catalog) {
    assert.ok(c.requirements.length);
    assert.ok(c.audience.length);
    assert.ok(c.skills.length);
    assert.ok(c.project);
    assert.ok(c.instructorBio);
  }
  assert.equal(
    restored.catalog.reduce((n, c) => n + c.lessons.length, 0),
    25,
  );
});
test("review summaries use entered records and start empty", () => {
  const s = initialState(seedCourses);
  assert.deepEqual(reviewSummary(s, "business").count, 0);
  s.reviews = [
    { courseId: "business", rating: 4 },
    { courseId: "web", rating: 1 },
  ];
  assert.equal(reviewSummary(s, "business").average, 4);
  assert.equal(reviewSummary(s, "business").count, 1);
  assert.equal(
    reviewSummary(s, "business").distribution.find((r) => r.stars === 4).count,
    1,
  );
});
test("invalid ratings and duplicate local course reviews are not restored", () => {
  const s = initialState(seedCourses);
  s.reviews = [
    {
      id: "one",
      courseId: "web",
      rating: 5,
      text: "A minha opinião.",
      name: "Ana",
      at: "2026-10-22",
    },
    { id: "two", courseId: "web", rating: 4, text: "Repetida.", name: "Ana" },
    { id: "three", courseId: "business", rating: 999, text: "Inválida." },
  ];
  const restored = normalizeState(s, seedCourses);
  assert.equal(restored.reviews.length, 1);
  assert.equal(restored.reviews[0].rating, 5);
});
