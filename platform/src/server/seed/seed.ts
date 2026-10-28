import { eq, sql } from "drizzle-orm";
import { slugify } from "@/lib/text";
import type { Db, Executor } from "../db/client";
import { categories, courses, lessons, modules, quizQuestions, settings, users, type CourseLevel, type FaqItem, type Role } from "../db/schema";
import { hashPassword } from "../auth/password";
import { setSetting } from "../settings";
import { randomBytes } from "node:crypto";
import legacy from "./legacy-catalog.json";
import demoVideos from "./demo-videos.json";

/** Local-only accounts so the owner can try every role. Never created on a hosted database. */
export const LOCAL_ACCOUNTS: { role: Role; name: string; email: string; password: string; headline?: string; bio?: string }[] = [
  { role: "admin", name: "Gestão Kuvona", email: "gestao@kuvona.local", password: "Kuvona-gestao-2026" },
  {
    role: "instructor",
    name: "Equipa Kuvona",
    email: "equipa@kuvona.local",
    password: "Kuvona-instrutor-2026",
    headline: "Conteúdos editoriais da Academia Kuvona",
    bio: "A Equipa Kuvona escreve percursos práticos em português, pensados para quem aprende no telemóvel e com dados móveis. Cada curso combina explicações curtas, exercícios aplicados e um projeto final.",
  },
  {
    role: "instructor",
    name: "Curadoria Kuvona",
    email: "curadoria@kuvona.local",
    password: "Kuvona-curadoria-2026",
    headline: "Percursos com vídeos públicos selecionados",
    bio: "A Curadoria Kuvona organiza percursos introdutórios com vídeos públicos do Curso em Vídeo, de Gustavo Guanabara, e exercícios escritos. A Kuvona não representa nem vende o curso original.",
  },
  { role: "student", name: "Estudante Demo", email: "estudante@kuvona.local", password: "Kuvona-estudante-2026" },
];

const CATEGORY_INFO: Record<string, string> = {
  Tecnologia: "Programação, web e ferramentas digitais para construir projetos reais.",
  Negócios: "Empreendedorismo, vendas e gestão para pequenos negócios.",
  Criatividade: "Design, comunicação visual e storytelling.",
  Carreira: "Competências profissionais, entrevistas e crescimento.",
  Produtividade: "Folhas de cálculo, organização e ferramentas de trabalho.",
  Marketing: "Redes sociais, conteúdo e conquista de clientes.",
};

const LEVELS: Record<string, CourseLevel> = {
  Iniciante: "beginner",
  Intermédio: "intermediate",
  Avançado: "advanced",
  "Todos os níveis": "all",
};

type LegacyLesson = { title: string; module: string; minutes: number; video?: string; source?: string; content: string[]; task?: string };
type LegacyCourse = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  price: number;
  instructor: string;
  featured?: boolean;
  description: string;
  outcomes: string[];
  skills?: string[];
  requirements?: string[];
  audience?: string[];
  project?: string;
  lessons: LegacyLesson[];
  quiz: { question: string; options: string[]; correct: number; explanation: string }[];
  resources?: { title: string; text: string }[];
};

function faqFor(priceCents: number): FaqItem[] {
  const base: FaqItem[] = [
    { q: "Posso ver uma aula antes de decidir?", a: "Sim. As aulas marcadas como pré-visualização estão abertas a todos, sem conta." },
    {
      q: "Recebo um certificado?",
      a: "Sim, ao concluíres todas as aulas e obteres pelo menos 70% na avaliação final. Cada certificado tem um código que qualquer pessoa pode verificar.",
    },
    { q: "Posso estudar no telemóvel?", a: "Sim. As aulas são curtas e o progresso fica guardado na tua conta, em qualquer dispositivo." },
  ];
  return priceCents === 0
    ? [{ q: "É mesmo gratuito?", a: "Sim. Cria uma conta e inscreve-te: o curso fica na tua área de aprendizagem." }, ...base]
    : [
        {
          q: "Como funciona o pagamento?",
          a: "Pagas por M-Pesa ou e-Mola para a conta da Academia e indicas o ID da transação. A equipa confirma no extrato e o acesso abre de seguida; recebes um email.",
        },
        ...base,
      ];
}

const DEMO_PARTNERS = {
  heading: "Empresas que queremos ao nosso lado",
  names: ["Mozal", "Millennium bim", "BCI", "Vodacom", "Movitel", "CFM", "EDM", "Standard Bank"],
  isDemo: true,
};

export async function seedIfEmpty(db: Db) {
  const [existing] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  if ((existing?.n ?? 0) > 0) {
    // Local databases created before a setting existed get its demo default once.
    const [partners] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, "partners"));
    if (!partners) await setSetting(db, "partners", DEMO_PARTNERS, null);
    return false;
  }
  await seedLocal(db);
  return true;
}

/** Categories, courses, modules, lessons and quizzes. `instructors` maps instructor display name → user id. */
export async function seedCatalog(tx: Executor, instructors: Map<string, string>) {
  const catalog = legacy.courses as LegacyCourse[];
  const categoryIds = new Map<string, string>();
  const names = [...new Set(catalog.map((c) => c.category))];
  for (const [position, name] of names.entries()) {
    const [row] = await tx
      .insert(categories)
      .values({ name, slug: slugify(name), description: CATEGORY_INFO[name] ?? "", position })
      .returning({ id: categories.id });
    categoryIds.set(name, row!.id);
  }

  for (const [index, c] of catalog.entries()) {
    const [course] = await tx
      .insert(courses)
      .values({
        slug: slugify(c.title),
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        categoryId: categoryIds.get(c.category) ?? null,
        level: LEVELS[c.level] ?? "beginner",
        priceCents: c.price,
        instructorId: instructors.get(c.instructor) ?? instructors.get("Equipa Kuvona")!,
        outcomes: c.outcomes,
        requirements: c.requirements ?? [],
        audience: c.audience ?? [],
        skills: c.skills ?? [],
        project: c.project ?? "",
        faq: faqFor(c.price),
        featured: Boolean(c.featured) || index < 3,
        coverSeed: 1000 + index * 7919,
        status: "published",
        submittedAt: new Date(),
        publishedAt: new Date(Date.now() - (catalog.length - index) * 86_400_000),
      })
      .returning({ id: courses.id });

    const moduleIds = new Map<string, string>();
    for (const [li, lesson] of c.lessons.entries()) {
      const moduleTitle = lesson.module.replace(/^\d+\s*·\s*/, "");
      if (!moduleIds.has(moduleTitle)) {
        const [mod] = await tx
          .insert(modules)
          .values({ courseId: course!.id, title: moduleTitle, position: moduleIds.size })
          .returning({ id: modules.id });
        moduleIds.set(moduleTitle, mod!.id);
      }
      const isLast = li === c.lessons.length - 1;
      const demo = (demoVideos as Record<string, ({ id: string; source: string } | null)[] | string>)[c.id] as ({ id: string; source: string } | null)[] | undefined;
      const demoVideo = Array.isArray(demo) ? demo[li] : null;
      const material = isLast && c.resources?.length
        ? `\n\n## Material de apoio\n\n${c.resources.map((r) => `### ${r.title}\n\n${r.text.trim()}`).join("\n\n")}`
        : "";
      const position = c.lessons.slice(0, li).filter((l) => l.module === lesson.module).length;
      await tx.insert(lessons).values({
        courseId: course!.id,
        moduleId: moduleIds.get(moduleTitle)!,
        title: lesson.title,
        summary: lesson.content[0]?.split(". ")[0]?.slice(0, 200) ?? "",
        body: lesson.content.join("\n\n") + material,
        task: lesson.task ?? "",
        youtubeVideoId: lesson.video ?? demoVideo?.id ?? null,
        videoSource: lesson.video ? (lesson.source ?? legacy.source) : (demoVideo?.source ?? null),
        durationSeconds: lesson.minutes * 60,
        isPreview: li === 0,
        position,
      });
    }
    for (const [qi, q] of c.quiz.entries()) {
      await tx.insert(quizQuestions).values({
        courseId: course!.id,
        prompt: q.question,
        options: q.options,
        correctIndex: q.correct,
        explanation: q.explanation,
        position: qi,
      });
    }
  }

}

/** The house instructors behind the editorial catalog; nobody can sign in as them (random unusable password). */
const HOUSE_INSTRUCTORS = LOCAL_ACCOUNTS.filter((a) => a.role === "instructor");

/**
 * Loads the 8-course starter catalog (real public YouTube tutorials) on ANY database, local or hosted.
 * Creates no test accounts and no demo payment numbers. Idempotent: does nothing if courses already exist.
 */
export async function seedCatalogOnly(db: Db) {
  const [existing] = await db.select({ n: sql<number>`count(*)::int` }).from(courses);
  if ((existing?.n ?? 0) > 0) return false;
  await db.transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const account of HOUSE_INSTRUCTORS) {
      const email = account.email.replace(/@.*$/, "@kuvona.invalid");
      const [found] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (found) {
        ids.set(account.name, found.id);
        continue;
      }
      const [row] = await tx
        .insert(users)
        .values({
          name: account.name,
          email,
          role: "instructor",
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
          headline: account.headline ?? null,
          bio: account.bio ?? null,
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id });
      ids.set(account.name, row!.id);
    }
    await seedCatalog(tx, ids);
  });
  return true;
}

export async function seedLocal(db: Db) {
  await db.transaction(async (tx) => {
    const userIds = new Map<string, string>();
    for (const account of LOCAL_ACCOUNTS) {
      const [row] = await tx
        .insert(users)
        .values({
          name: account.name,
          email: account.email,
          role: account.role,
          passwordHash: await hashPassword(account.password),
          headline: account.headline ?? null,
          bio: account.bio ?? null,
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id });
      userIds.set(account.name, row!.id);
    }

    await seedCatalog(tx, userIds);

    await setSetting(
      tx,
      "payments",
      {
        mpesa: { number: "84 000 0000", accountName: "Academia Kuvona (exemplo — alterar em Definições)" },
        emola: { number: "86 000 0000", accountName: "Academia Kuvona (exemplo — alterar em Definições)" },
        instructions: "Usa a referência do pedido na descrição da transferência, se a tua carteira o permitir.",
        orderTtlHours: 48,
      },
      null,
    );
    await setSetting(tx, "school", { supportEmail: "apoio@kuvona.local", supportPhone: "", legalName: "Academia Kuvona", nuit: "" }, null);
    // Pitch mock-up only (local mode): flagged as demo on the page, never seeded on a hosted database.
    await setSetting(tx, "partners", DEMO_PARTNERS, null);
  });
}
