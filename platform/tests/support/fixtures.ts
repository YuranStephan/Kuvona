import { eq } from "drizzle-orm";
import { openPglite, type Db } from "@/server/db/client";
import { categories, courses, lessons, modules, quizQuestions, users, type Role } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { setSetting } from "@/server/settings";

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createTestDb() {
  const { db, close } = await openPglite();
  await setSetting(db, "payments", { mpesa: { number: "840000000", accountName: "Kuvona Teste" }, emola: { number: "", accountName: "" } }, null);
  return { db, close };
}

let cachedHash: string | undefined;
export async function createUser(db: Db, role: Role = "student", overrides: { email?: string; name?: string; password?: string } = {}) {
  const passwordHash = overrides.password ? await hashPassword(overrides.password) : (cachedHash ??= await hashPassword("password-123"));
  const [user] = await db
    .insert(users)
    .values({ email: overrides.email ?? `${role}-${unique()}@teste.co.mz`, name: overrides.name ?? `Pessoa ${role}`, role, passwordHash })
    .returning();
  return user!;
}

export const VIDEO_PREVIEW = "Ejkb_YpuHWs";
export const VIDEO_PAID_1 = "jgQjeqGRdgA";
export const VIDEO_PAID_2 = "UForX7ehChM";

export async function createCourse(
  db: Db,
  instructorId: string,
  opts: { priceCents?: number; status?: "draft" | "in_review" | "published"; quiz?: boolean } = {},
) {
  const [category] = await db.insert(categories).values({ name: `Cat ${unique()}`, slug: `cat-${unique()}` }).returning();
  const [course] = await db
    .insert(courses)
    .values({
      slug: `curso-${unique()}`,
      title: "Curso de teste",
      subtitle: "Um subtítulo suficientemente longo",
      description: "Descrição ".repeat(20),
      categoryId: category!.id,
      priceCents: opts.priceCents ?? 150_000,
      instructorId,
      status: opts.status ?? "published",
      outcomes: ["Um", "Dois"],
      publishedAt: new Date(),
    })
    .returning();
  const [mod] = await db.insert(modules).values({ courseId: course!.id, title: "Módulo 1", position: 0 }).returning();
  const lessonRows = await db
    .insert(lessons)
    .values([
      { courseId: course!.id, moduleId: mod!.id, title: "Aula 1", isPreview: true, youtubeVideoId: VIDEO_PREVIEW, position: 0, durationSeconds: 600 },
      { courseId: course!.id, moduleId: mod!.id, title: "Aula 2", youtubeVideoId: VIDEO_PAID_1, position: 1, durationSeconds: 600 },
      { courseId: course!.id, moduleId: mod!.id, title: "Aula 3", youtubeVideoId: VIDEO_PAID_2, position: 2, durationSeconds: 600 },
    ])
    .returning();
  if (opts.quiz !== false) {
    await db.insert(quizQuestions).values([
      { courseId: course!.id, prompt: "P1?", options: ["a", "b", "c"], correctIndex: 0, position: 0 },
      { courseId: course!.id, prompt: "P2?", options: ["a", "b", "c"], correctIndex: 1, position: 1 },
      { courseId: course!.id, prompt: "P3?", options: ["a", "b", "c"], correctIndex: 2, position: 2 },
    ]);
  }
  return { course: course!, lessons: lessonRows };
}

export async function reload<T extends { id: string }>(db: Db, table: typeof courses | typeof users, row: T) {
  const [fresh] = await db.select().from(table).where(eq(table.id, row.id));
  return fresh;
}
