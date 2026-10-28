import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { courses, enrollments, lessonProgress } from "@/server/db/schema";
import { getCourseDetail, listCatalog } from "@/server/catalog/queries";
import {
  addLesson,
  deleteLesson,
  editableCourse,
  publishCourse,
  submitForReview,
  updateCourseDetails,
  updateLesson,
} from "@/server/catalog/editor";
import { enrollFree, grantEnrollment } from "@/server/enrollment/service";
import {
  getClassroom,
  recordProgress,
  setLessonCompleted,
} from "@/server/learning/progress";
import { getQuizForStudent, submitQuiz } from "@/server/learning/quiz";
import { upsertReview } from "@/server/learning/community";
import {
  certificateEligibility,
  findCertificateByCode,
  issueCertificateIfEligible,
} from "@/server/certificates/service";
import {
  createCourse,
  createTestDb,
  createUser,
  VIDEO_PAID_1,
  VIDEO_PAID_2,
  VIDEO_PREVIEW,
} from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

describe("video and content exposure", () => {
  it("public course pages only reveal preview videos", async () => {
    const instructor = await createUser(db, "instructor");
    const { course } = await createCourse(db, instructor.id);
    const anonymous = JSON.stringify(
      await getCourseDetail(db, course.slug, null),
    );
    expect(anonymous).not.toContain(VIDEO_PAID_1);
    expect(anonymous).not.toContain(VIDEO_PAID_2);
    const student = await createUser(db);
    const asStudent = JSON.stringify(
      await getCourseDetail(db, course.slug, student),
    );
    expect(asStudent).not.toContain(VIDEO_PAID_1);
    const catalog = JSON.stringify(await listCatalog(db, {}));
    expect(catalog).not.toContain(VIDEO_PAID_1);
    expect(catalog).not.toContain(VIDEO_PREVIEW);
  });

  it("drafts are invisible to the public but visible to their instructor and staff", async () => {
    const instructor = await createUser(db, "instructor");
    const admin = await createUser(db, "admin");
    const { course } = await createCourse(db, instructor.id, {
      status: "draft",
    });
    expect(await getCourseDetail(db, course.slug, null)).toBeNull();
    expect(
      await getCourseDetail(db, course.slug, await createUser(db)),
    ).toBeNull();
    expect(await getCourseDetail(db, course.slug, instructor)).not.toBeNull();
    expect(await getCourseDetail(db, course.slug, admin)).not.toBeNull();
  });

  it("the classroom requires enrollment, ownership or staff", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const admin = await createUser(db, "admin");
    const { course } = await createCourse(db, instructor.id);
    await expect(getClassroom(db, student, course.slug)).rejects.toThrow(
      /acesso/,
    );
    expect((await getClassroom(db, instructor, course.slug)).access).toBe(
      "owner",
    );
    expect((await getClassroom(db, admin, course.slug)).access).toBe("admin");
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    expect((await getClassroom(db, student, course.slug)).access).toBe(
      "enrolled",
    );
  });

  it("revoked students lose the classroom", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course } = await createCourse(db, instructor.id);
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    await db
      .update(enrollments)
      .set({ status: "revoked" })
      .where(eq(enrollments.userId, student.id));
    await expect(getClassroom(db, student, course.slug)).rejects.toThrow(
      /acesso/,
    );
  });

  it("progress cannot be recorded without access", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const { lessons } = await createCourse(db, instructor.id);
    await expect(
      recordProgress(db, student, {
        lessonId: lessons[1]!.id,
        positionSeconds: 10,
        durationSeconds: 100,
        ended: false,
      }),
    ).rejects.toThrow();
  });
});

describe("free enrollment", () => {
  it("only works for free published courses", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const paid = await createCourse(db, instructor.id, { priceCents: 50_000 });
    await expect(enrollFree(db, student.id, paid.course.id)).rejects.toThrow(
      /pago/,
    );
    const draft = await createCourse(db, instructor.id, {
      priceCents: 0,
      status: "draft",
    });
    await expect(enrollFree(db, student.id, draft.course.id)).rejects.toThrow(
      /não disponível/,
    );
    const free = await createCourse(db, instructor.id, { priceCents: 0 });
    expect((await enrollFree(db, student.id, free.course.id)).changed).toBe(
      true,
    );
    expect((await enrollFree(db, student.id, free.course.id)).changed).toBe(
      false,
    );
  });
});

describe("course editing permissions", () => {
  it("instructors only edit their own courses; students edit nothing", async () => {
    const owner = await createUser(db, "instructor");
    const other = await createUser(db, "instructor");
    const student = await createUser(db);
    const admin = await createUser(db, "admin");
    const { course } = await createCourse(db, owner.id, { status: "draft" });
    await expect(editableCourse(db, other, course.id)).rejects.toThrow(
      /teus próprios/,
    );
    await expect(editableCourse(db, student, course.id)).rejects.toThrow();
    await expect(editableCourse(db, owner, course.id)).resolves.toBeTruthy();
    await expect(editableCourse(db, admin, course.id)).resolves.toBeTruthy();
  });

  it("only staff publish; instructors submit for review", async () => {
    const owner = await createUser(db, "instructor");
    const admin = await createUser(db, "admin");
    const { course } = await createCourse(db, owner.id, { status: "draft" });
    await expect(publishCourse(db, owner, course.id)).rejects.toThrow(/gestão/);
    await submitForReview(db, owner, course.id);
    await publishCourse(db, admin, course.id);
    const [row] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, course.id));
    expect(row!.status).toBe("published");
  });

  it("rejects non-YouTube video links and non-https materials", async () => {
    const owner = await createUser(db, "instructor");
    const { lessons } = await createCourse(db, owner.id, { status: "draft" });
    const base = {
      title: "Aula",
      durationMinutes: 5,
      isPreview: false,
      resources: [],
    };
    await expect(
      updateLesson(db, owner, lessons[0]!.id, {
        ...base,
        youtubeUrl: "https://evil.example/watch?v=Ejkb_YpuHWs",
      }),
    ).rejects.toThrow(/YouTube/);
    await expect(
      updateLesson(db, owner, lessons[0]!.id, {
        ...base,
        youtubeUrl: "",
        resources: [{ title: "x", url: "javascript:alert(1)" }],
      }),
    ).rejects.toThrow();
    await updateLesson(db, owner, lessons[0]!.id, {
      ...base,
      youtubeUrl: "https://youtu.be/jgQjeqGRdgA?t=10",
    });
  });

  it("blocks deleting lessons that hold student progress", async () => {
    const owner = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course, lessons } = await createCourse(db, owner.id);
    await db
      .insert(lessonProgress)
      .values({
        userId: student.id,
        lessonId: lessons[1]!.id,
        courseId: course.id,
        completedAt: new Date(),
      });
    await expect(deleteLesson(db, owner, lessons[1]!.id)).rejects.toThrow(
      /progresso/,
    );
    const extra = await addLesson(
      db,
      owner,
      lessons[0]!.moduleId,
      "Aula extra",
    );
    await deleteLesson(db, owner, extra.id);
  });

  it("validates course details server-side", async () => {
    const owner = await createUser(db, "instructor");
    const { course } = await createCourse(db, owner.id, { status: "draft" });
    const valid = {
      title: "Novo título",
      level: "beginner" as const,
      priceCents: 99_900,
      outcomes: [],
      requirements: [],
      audience: [],
      skills: [],
      faq: [],
    };
    await expect(
      updateCourseDetails(db, owner, course.id, { ...valid, priceCents: -5 }),
    ).rejects.toThrow();
    await expect(
      updateCourseDetails(db, owner, course.id, {
        ...valid,
        trailerUrl: "https://vimeo.com/1",
      }),
    ).rejects.toThrow(/trailer/);
    await updateCourseDetails(db, owner, course.id, valid);
  });
});

describe("assessment, certificates and reviews", () => {
  it("hides the answer key, requires every lesson, grades on the server and issues a verifiable certificate", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db, "student", { name: "Ana Mucavele" });
    const { course, lessons } = await createCourse(db, instructor.id);
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });

    const quiz = await getQuizForStudent(db, student, course.id);
    expect(JSON.stringify(quiz.questions)).not.toContain("correctIndex");
    expect(quiz.unlocked).toBe(false);
    await expect(submitQuiz(db, student, course.id, [0, 1, 2])).rejects.toThrow(
      /todas as aulas/,
    );

    for (const lesson of lessons)
      await setLessonCompleted(db, student, lesson.id, true);
    const fail = await submitQuiz(db, student, course.id, [0, 0, 0]);
    expect(fail.attempt.scorePercent).toBe(33);
    expect(fail.certificateCode).toBeNull();
    await expect(submitQuiz(db, student, course.id, [0, 1])).rejects.toThrow(
      /todas as perguntas/,
    );

    const pass = await submitQuiz(db, student, course.id, [0, 1, 2]);
    expect(pass.attempt.passed).toBe(true);
    expect(pass.certificateCode).toMatch(/^KVC-/);
    const verified = await findCertificateByCode(
      db,
      pass.certificateCode!.toLowerCase(),
    );
    expect(verified?.recipientName).toBe("Ana Mucavele");
    expect(verified?.revokedAt).toBeNull();
  });

  it("eligibility is rechecked: unmarking a lesson or losing access removes it", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course, lessons } = await createCourse(db, instructor.id, {
      quiz: false,
    });
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    for (const lesson of lessons)
      await setLessonCompleted(db, student, lesson.id, true);
    expect(
      (await certificateEligibility(db, student.id, course.id)).eligible,
    ).toBe(true);
    const certificate = await issueCertificateIfEligible(
      db,
      student.id,
      course.id,
    );
    expect(certificate).not.toBeNull();
    expect((await findCertificateByCode(db, certificate!.code))?.eligible).toBe(
      true,
    );
    await setLessonCompleted(db, student, lessons[0]!.id, false);
    expect(
      (await certificateEligibility(db, student.id, course.id)).eligible,
    ).toBe(false);
    expect((await findCertificateByCode(db, certificate!.code))?.eligible).toBe(
      false,
    );
    await setLessonCompleted(db, student, lessons[0]!.id, true);
    expect((await findCertificateByCode(db, certificate!.code))?.eligible).toBe(
      true,
    );
    await db
      .update(enrollments)
      .set({ status: "revoked" })
      .where(eq(enrollments.userId, student.id));
    expect((await findCertificateByCode(db, certificate!.code))?.eligible).toBe(
      false,
    );
  });

  it("video heartbeat completes a lesson near the end and never moves progress backwards", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course, lessons } = await createCourse(db, instructor.id);
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    const lessonId = lessons[1]!.id;
    expect(
      (
        await recordProgress(db, student, {
          lessonId,
          positionSeconds: 300,
          durationSeconds: 600,
          ended: false,
        })
      ).completed,
    ).toBe(false);
    await recordProgress(db, student, {
      lessonId,
      positionSeconds: 100,
      durationSeconds: 600,
      ended: false,
    });
    const [row] = await db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.lessonId, lessonId));
    expect(row!.watchedSeconds).toBe(300);
    expect(
      (
        await recordProgress(db, student, {
          lessonId,
          positionSeconds: 560,
          durationSeconds: 600,
          ended: false,
        })
      ).completed,
    ).toBe(true);
  });

  it("reviews need an active enrollment and at least one completed lesson", async () => {
    const instructor = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course, lessons } = await createCourse(db, instructor.id);
    await expect(
      upsertReview(db, student, course.id, { rating: 5 }),
    ).rejects.toThrow(/inscritos/);
    await grantEnrollment(db, {
      userId: student.id,
      courseId: course.id,
      source: "grant",
    });
    await expect(
      upsertReview(db, student, course.id, { rating: 5 }),
    ).rejects.toThrow(/pelo menos uma aula/);
    await setLessonCompleted(db, student, lessons[0]!.id, true);
    await upsertReview(db, student, course.id, {
      rating: 4,
      body: "Muito útil",
    });
    await upsertReview(db, student, course.id, {
      rating: 5,
      body: "Ainda melhor",
    });
    const detail = await getCourseDetail(db, course.slug, null);
    expect(detail!.stats.ratingCount).toBe(1);
    expect(detail!.stats.ratingAvg).toBe(5);
  });
});
