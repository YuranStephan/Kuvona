// Browser QA for the public marketplace, role boundaries, course authoring and editable content.
// Local mode only; creates a draft QA course and restores the temporary home copy.
import { existsSync, mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3100";
if (!/^https?:\/\/(localhost|127\.0\.0\.1):3100\/?$/.test(base))
  throw new Error(
    "Este teste só pode usar o servidor local da Kuvona na porta 3100.",
  );
const executablePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => p && existsSync(p));
mkdirSync(".qa", { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(60_000);
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let originalHero: string | undefined;
let courseBase = "";
let isPublished = false;
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function shot(name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `.qa/studio-${name}.png`, fullPage: true });
  console.log(`✓ ${name}`);
}
async function visit(path: string) {
  const response = await page.goto(`${base}${path}`);
  check(response?.ok(), `Falhou a página ${path}: ${response?.status()}`);
  await page.locator("h1").first().waitFor();
  await page.waitForFunction(
    () => !document.querySelector('form[data-action-ready="false"]'),
  );
}
async function login(email: string, password: string) {
  await context.clearCookies();
  await visit("/entrar");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/entrar"),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
}
async function mobileShot(name: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    `Overflow horizontal: ${name}`,
  );
  await shot(name);
  await page.setViewportSize({ width: 1360, height: 900 });
}
async function saveLesson(path: string, title: string, preview: boolean) {
  await visit(path);
  await page.locator('[name="title"]').fill(title);
  await page
    .locator('[name="body"]')
    .fill(
      "## Prática guiada\n\nEste conteúdo de teste permite verificar a edição, a pré-visualização e a publicação de uma aula completa.",
    );
  await page.locator('[name="durationMinutes"]').fill("10");
  if (preview) {
    await page
      .locator('[name="youtubeUrl"]')
      .fill("https://www.youtube.com/watch?v=Ejkb_YpuHWs");
    await page
      .locator('[name="videoSource"]')
      .fill("Curso em Vídeo — referência de teste");
    await page.locator('[name="isPreview"]').check();
  }
  await page.getByRole("button", { name: "Guardar aula", exact: true }).click();
  await page.getByText("Aula guardada.", { exact: true }).waitFor();
}

try {
  for (const path of [
    "/",
    "/sobre",
    "/ensinar",
    "/termos",
    "/privacidade",
    "/reembolsos",
    "/verificar",
  ])
    await visit(path);
  await visit("/cursos");
  const cards = page.locator(".course-card");
  check(
    (await cards.count()) >= 8,
    "O catálogo inicial precisa dos oito cursos.",
  );
  check(
    (await cards.locator('a[href^="/checkout/"], button').count()) === 0,
    "Os cartões só devem abrir os detalhes.",
  );
  const photoPaths = await cards
    .locator("svg image")
    .evaluateAll((images) => images.map((image) => image.getAttribute("href")));
  check(
    photoPaths.length >= 8 &&
      photoPaths.every((path) => path?.startsWith("/course-images/")),
    "As capas fotográficas têm de aparecer no catálogo.",
  );
  await shot("catalogo");
  await mobileShot("catalogo-mobile");
  await cards.first().click();
  await page.waitForURL(/\/cursos\/[^/]+$/);
  await page
    .getByRole("heading", { name: "Programa do curso", exact: true })
    .waitFor();
  await visit("/cursos/o-teu-negocio-comeca-aqui");
  await page.getByRole("link", { name: /Comprar curso/ }).waitFor();
  await shot("detalhes");
  await mobileShot("detalhes-mobile");
  const instructor = await page
    .locator('a[href^="/instrutores/"]')
    .first()
    .getAttribute("href");
  check(instructor, "Perfil público do instrutor em falta.");
  await visit(instructor);

  await login("estudante@kuvona.local", "Kuvona-estudante-2026");
  for (const path of ["/conta", "/desejos", "/pedidos", "/aprender"])
    await visit(path);
  await visit("/admin");
  check(
    page.url().includes("/sem-acesso"),
    "Um estudante não pode entrar na gestão.",
  );
  await visit("/instrutor");
  check(
    page.url().includes("/sem-acesso"),
    "Um estudante não pode entrar no estúdio.",
  );

  await login("equipa@kuvona.local", "Kuvona-instrutor-2026");
  await visit("/instrutor/cursos?novo=1");
  await page
    .getByRole("textbox", { name: "Título do curso", exact: true })
    .fill(`QA percurso completo ${Date.now()}`);
  await Promise.all([
    page.waitForURL(/\/instrutor\/cursos\/[0-9a-f-]{36}$/),
    page.getByRole("button", { name: "Criar e editar", exact: true }).click(),
  ]);
  courseBase = new URL(page.url()).pathname;
  await page
    .locator('[name="subtitle"]')
    .fill("Um percurso de teste completo, criado pelo controlo de qualidade.");
  await page
    .locator('textarea[name="description"]')
    .fill(
      "Curso de controlo de qualidade da plataforma Kuvona. Este rascunho foi criado para verificar todos os passos do editor, desde a apresentação até à revisão da gestão.",
    );
  const category = await page
    .locator('[name="categoryId"] option')
    .nth(1)
    .getAttribute("value");
  check(category, "É necessária uma categoria.");
  await page.locator('[name="categoryId"]').selectOption(category);
  await page.locator('[name="coverSeed"]').selectOption("1000");
  await page.locator('[name="price"]').fill("1500");
  const outcomes = page.locator(".list-input").first();
  await outcomes
    .locator('input:not([type="hidden"])')
    .first()
    .fill("Conhecer o percurso do editor");
  await outcomes
    .getByRole("button", { name: "Adicionar", exact: true })
    .click();
  await outcomes
    .locator('input:not([type="hidden"])')
    .nth(1)
    .fill("Publicar um curso com revisão");
  await page
    .getByRole("button", { name: "Guardar alterações", exact: true })
    .click();
  await page.getByText("Alterações guardadas.", { exact: true }).waitFor();

  await visit(`${courseBase}/curriculo`);
  await page
    .getByRole("textbox", {
      name: "Título da nova aula em Introdução",
      exact: true,
    })
    .fill("Primeira aula prática");
  await page
    .getByRole("button", { name: "Adicionar aula", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Primeira aula prática", exact: true })
    .waitFor();
  const lessonPath = await page
    .getByRole("link", { name: "Primeira aula prática", exact: true })
    .getAttribute("href");
  check(lessonPath, "Link de edição da aula em falta.");
  await saveLesson(lessonPath, "Primeira aula prática", true);
  await shot("aula-editor");
  await visit(`${courseBase}/curriculo`);
  await shot("curriculo");
  await mobileShot("curriculo-mobile");

  await visit(`${courseBase}/avaliacao`);
  const newQuestion = page.locator("section.form-section").filter({
    has: page.getByRole("heading", { name: "Nova pergunta", exact: true }),
  });
  await newQuestion
    .locator('[name="prompt"]')
    .fill("Qual é a melhor forma de começar este percurso?");
  for (const [i, option] of [
    "Ignorar o programa",
    "Consultar os objetivos",
    "Comprar sem ler",
  ].entries())
    await newQuestion.locator('[name="options"]').nth(i).fill(option);
  await newQuestion.locator('[name="correctIndex"][value="1"]').check();
  await newQuestion
    .locator('[name="explanation"]')
    .fill(
      "Consulta os objetivos e a aula de pré-visualização antes de decidir.",
    );
  await newQuestion
    .getByRole("button", { name: "Adicionar pergunta", exact: true })
    .click();
  await page.getByText("Pergunta adicionada.", { exact: true }).waitFor();
  check(
    (await newQuestion.locator('[name="options"]').first().inputValue()) === "",
    "O formulário de nova pergunta deve limpar as respostas depois de guardar.",
  );
  await shot("avaliacao-editor");
  await visit(`${courseBase}/estudantes`);
  await visit("/instrutor/perguntas");
  await visit(`${courseBase}/publicacao`);
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await page
    .getByText("O curso está na fila de revisão da gestão.", { exact: true })
    .waitFor();
  await shot("publicacao-revisao");

  await login("gestao@kuvona.local", "Kuvona-gestao-2026");
  await visit(`${courseBase}/publicacao`);
  await page
    .getByRole("button", { name: "Publicar curso", exact: true })
    .click();
  await page.getByText("Curso publicado na loja.", { exact: true }).waitFor();
  isPublished = true;
  const publicCoursePath = await page
    .getByRole("link", { name: /Ver na loja/ })
    .getAttribute("href");
  check(publicCoursePath, "Curso publicado sem link para a loja.");
  await visit(publicCoursePath);
  await page
    .getByRole("heading", { name: "Programa do curso", exact: true })
    .waitFor();
  await visit(`${courseBase}/publicacao`);
  await page
    .getByRole("button", { name: "Retirar da loja", exact: true })
    .click();
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "Retirar da loja", exact: true })
    .click();
  await page
    .getByText("Curso retirado da loja. Os inscritos mantêm o acesso.", {
      exact: true,
    })
    .waitFor();
  isPublished = false;

  await visit("/admin/definicoes");
  originalHero = await page.locator('[name="heroTitle"]').inputValue();
  await page
    .locator('[name="heroTitle"]')
    .fill("Aprende hoje.\nConstrói amanhã.");
  await page
    .getByRole("button", { name: "Guardar conteúdos do site", exact: true })
    .click();
  await page
    .getByText(
      "Conteúdos atualizados. As páginas públicas já apresentam as alterações.",
      { exact: true },
    )
    .waitFor();
  await visit("/");
  check(
    (await page.locator("h1").innerText()).includes("Constrói amanhã."),
    "A home não apresentou o texto guardado na gestão.",
  );
  await visit("/admin/definicoes");
  await page.locator('[name="heroTitle"]').fill(originalHero);
  await page
    .getByRole("button", { name: "Guardar conteúdos do site", exact: true })
    .click();
  await page
    .getByText(
      "Conteúdos atualizados. As páginas públicas já apresentam as alterações.",
      { exact: true },
    )
    .waitFor();
  originalHero = undefined;
  await shot("definicoes");
  await mobileShot("definicoes-mobile");
  check(errors.length === 0, `Erros de JavaScript: ${errors.join("; ")}`);
  console.log(
    `Estúdio, permissões, catálogo, publicação e conteúdos verificados. Rascunho QA: ${courseBase}`,
  );
} catch (error) {
  await page
    .screenshot({ path: ".qa/studio-failure.png", fullPage: true })
    .catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  if (originalHero !== undefined || isPublished) {
    try {
      await login("gestao@kuvona.local", "Kuvona-gestao-2026");
      if (isPublished) {
        await visit(`${courseBase}/publicacao`);
        await page
          .getByRole("button", { name: "Retirar da loja", exact: true })
          .click();
        await page
          .locator("dialog[open]")
          .getByRole("button", { name: "Retirar da loja", exact: true })
          .click();
        await page
          .getByText("Curso retirado da loja. Os inscritos mantêm o acesso.", {
            exact: true,
          })
          .waitFor();
      }
      if (originalHero !== undefined) {
        await visit("/admin/definicoes");
        await page.locator('[name="heroTitle"]').fill(originalHero);
        await page
          .getByRole("button", {
            name: "Guardar conteúdos do site",
            exact: true,
          })
          .click();
        await page
          .getByText(
            "Conteúdos atualizados. As páginas públicas já apresentam as alterações.",
            { exact: true },
          )
          .waitFor();
      }
    } catch (error) {
      console.error(
        "Verifica a reposição do rascunho QA e do texto temporário:",
        error,
      );
      process.exitCode = 1;
    }
  }
  await browser.close();
}
