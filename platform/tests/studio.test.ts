import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import {
  addLesson,
  addModule,
  deleteModule,
  getEditorData,
  moveLesson,
  updateLesson,
} from "@/server/catalog/editor";
import {
  answerQuestion,
  askQuestion,
  instructorInbox,
} from "@/server/learning/community";
import { grantEnrollment } from "@/server/enrollment/service";
import { instructorTotals } from "@/server/analytics/service";
import { createCourse, createTestDb, createUser } from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

describe("studio ownership and editing", () => {
  it("keeps private editor content away from students and other instructors", async () => {
    const owner = await createUser(db, "instructor");
    const other = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course, lessons } = await createCourse(db, owner.id);
    await expect(getEditorData(db, other, course.id)).rejects.toThrow();
    await expect(getEditorData(db, student, course.id)).rejects.toThrow();
    await expect(
      updateLesson(db, other, lessons[0]!.id, {
        title: "Alteração indevida",
        durationMinutes: 1,
        isPreview: false,
        resources: [],
      }),
    ).rejects.toThrow();
    expect((await getEditorData(db, owner, course.id)).course.title).toBe(
      course.title,
    );
  });

  it("reorders lessons and rejects untrusted video/resource links", async () => {
    const owner = await createUser(db, "instructor");
    const { course } = await createCourse(db, owner.id);
    const mod = await addModule(db, owner, course.id, "Prática");
    const first = await addLesson(db, owner, mod.id, "Primeira");
    const second = await addLesson(db, owner, mod.id, "Segunda");
    await moveLesson(db, owner, second.id, "up");
    const data = await getEditorData(db, owner, course.id);
    expect(
      data.outline.find((m) => m.id === mod.id)!.lessons.map((l) => l.id),
    ).toEqual([second.id, first.id]);
    await expect(
      updateLesson(db, owner, first.id, {
        title: "Teste",
        durationMinutes: 2,
        isPreview: false,
        resources: [],
        youtubeUrl: "https://example.com/watch?v=Ejkb_YpuHWs",
      }),
    ).rejects.toThrow();
    await expect(
      updateLesson(db, owner, first.id, {
        title: "Teste",
        durationMinutes: 2,
        isPreview: false,
        resources: [{ title: "Teste", url: "javascript:alert(1)" }],
      }),
    ).rejects.toThrow();
    await expect(
      deleteModule(db, await createUser(db, "instructor"), mod.id),
    ).rejects.toThrow();
  });
});

describe("instructor Q&A inbox", () => {
  it("scopes questions to the owner and accepts a staff answer as resolved", async () => {
    const owner = await createUser(db, "instructor");
    const stranger = await createUser(db, "instructor");
    const admin = await createUser(db, "admin");
    const student = await createUser(db);
    const { course } = await createCourse(db, owner.id);
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    const q = await askQuestion(db, student, course.id, null, {
      title: "Como aplico este conceito?",
      body: "Podem explicar com um exemplo prático?",
    });
    expect(await instructorInbox(db, stranger.id, false)).toEqual([]);
    expect(
      (await instructorInbox(db, owner.id, false)).find(
        (item) => item.id === q.id,
      )?.answered,
    ).toBe(false);
    await expect(
      answerQuestion(db, stranger, q.id, "Resposta não autorizada"),
    ).rejects.toThrow();
    await answerQuestion(
      db,
      admin,
      q.id,
      "Vamos usar o exemplo do projeto da aula.",
    );
    expect(
      (await instructorInbox(db, owner.id, false)).find(
        (item) => item.id === q.id,
      )?.answered,
    ).toBe(true);
    expect((await instructorTotals(db, owner.id)).openQuestions).toBe(0);
  });
});
