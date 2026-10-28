// End-to-end smoke test against a running server (npm run dev / npm start), using local Chrome/Edge.
//   npm run test:e2e            (BASE_URL defaults to http://localhost:3100)
// Flow: register → free course → lesson → buy paid course (M-Pesa manual) → submit transaction ID
//       → admin confirms → student learns → completes lessons → quiz → certificate → public verification.
// Screenshots of every step go to .qa/e2e-*.png. Requires local mode (test accounts seeded).
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

let step = 0;
async function shot(page: Page, name: string) {
  step += 1;
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `.qa/e2e-${String(step).padStart(2, "0")}-${name}.png`,
    fullPage: true,
  });
  console.log(`  ✓ ${step}. ${name}`);
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALHOU: ${message}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${base}/entrar`);
  await page.locator('form[data-action-ready="true"]').waitFor();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/entrar"), {
      timeout: 60_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

async function logout(page: Page) {
  await page.context().clearCookies();
}

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(60_000);

try {
  const email = `e2e-${Date.now()}@teste.co.mz`;
  console.log(`Estudante de teste: ${email}`);

  // 1. Register
  await page.goto(`${base}/registar`);
  await page.locator('form[data-action-ready="true"]').waitFor();
  await page.fill('input[name="name"]', "Teresa Machava");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "senha-segura-1");
  await page.check('input[name="terms"]');
  await Promise.all([
    page.waitForURL(/\/aprender/),
    page.click('button[type="submit"]'),
  ]);
  await shot(page, "registo-painel");

  // 2. Free course enrollment
  await page.goto(`${base}/cursos/da-ideia-a-tua-primeira-pagina`);
  await shot(page, "curso-gratuito");
  await Promise.all([
    page.waitForURL(/\/aprender\/da-ideia-a-tua-primeira-pagina\//),
    page.click("text=Inscrever-me grátis"),
  ]);
  await shot(page, "sala-de-aula");

  // 3. Buy a paid course with manual M-Pesa
  await page.goto(`${base}/cursos/o-teu-negocio-comeca-aqui`);
  await Promise.all([
    page.waitForURL(/\/checkout\//),
    page.click("text=Comprar curso"),
  ]);
  await page.check('input[value="manual_mpesa"]');
  await page.check('input[name="terms"]');
  await shot(page, "checkout");
  await Promise.all([
    page.waitForURL(/\/pedidos\/KV-/),
    page.click("text=Continuar para o pagamento"),
  ]);
  const reference = page.url().split("/").pop()!;
  await shot(page, "pedido-instrucoes");
  const txId = `E2E${Date.now().toString(36).toUpperCase()}`;
  await page.fill('input[name="transactionId"]', txId);
  await page.fill('input[name="phone"]', "84 123 4567");
  await page.click("text=Enviei o pagamento");
  await page.waitForSelector("text=Estamos a verificar o pagamento");
  await shot(page, "pedido-em-verificacao");

  // Student must NOT have access yet.
  await page.goto(`${base}/aprender/o-teu-negocio-comeca-aqui`);
  expect(
    page.url().includes("/cursos/o-teu-negocio-comeca-aqui"),
    "sem confirmação, o estudante não pode entrar na sala de aula",
  );

  // 4. Admin confirms against the statement
  await logout(page);
  await login(page, "gestao@kuvona.local", "Kuvona-gestao-2026");
  await page.goto(`${base}/admin/pagamentos`);
  await shot(page, "admin-fila-pagamentos");
  await page.click(`text=${reference}`);
  await page.waitForURL(/\/admin\/pagamentos\//);
  await page.check('input[name="checked"]');
  await page.click("text=Confirmar pagamento");
  await page.waitForSelector("text=Pagamento confirmado — acesso concedido");
  await shot(page, "admin-pagamento-confirmado");

  // 5. Student learns, completes every lesson, passes the quiz
  await logout(page);
  await login(page, email, "senha-segura-1");
  await page.goto(`${base}/aprender`);
  await shot(page, "painel-com-cursos");
  await page.goto(`${base}/aprender/o-teu-negocio-comeca-aqui`);
  expect(
    /\/aprender\/o-teu-negocio-comeca-aqui\/.+/.test(page.url()),
    "depois da confirmação, a sala de aula abre",
  );
  await shot(page, "aula-paga");
  for (let i = 0; i < 10; i++) {
    const button = page.locator("button", { hasText: /Concluir e / });
    if (!(await button.count())) break;
    const previousPath = new URL(page.url()).pathname;
    await Promise.all([
      page.waitForURL((url) => url.pathname !== previousPath),
      button.first().click(),
    ]);
    if (page.url().endsWith("/avaliacao")) break;
  }
  await page.goto(`${base}/aprender/o-teu-negocio-comeca-aqui/avaliacao`);
  await shot(page, "avaliacao");
  const fieldsets = page.locator("form.quiz fieldset");
  const count = await fieldsets.count();
  expect(count > 0, "a avaliação está desbloqueada depois de todas as aulas");
  // Answer key is not in the page: try options until the score passes (max 3 attempts per question set).
  for (let i = 0; i < count; i++)
    await fieldsets.nth(i).locator("input").first().check();
  await page.click("text=Entregar avaliação");
  await page.waitForSelector(".quiz-score");
  await shot(page, "resultado-avaliacao");

  // The review reveals the correct options only after a submitted attempt. Use that feedback to retry.
  if (!(await page.locator('a[href^="/certificado/"]').count())) {
    const correct = await page
      .locator("fieldset.quiz-q")
      .evaluateAll((fields) =>
        fields.map(
          (field) =>
            field
              .querySelector(".quiz-option.correct span")
              ?.textContent?.trim() ?? "",
        ),
      );
    expect(
      correct.length === count && correct.every(Boolean),
      "a revisão deve explicar as respostas depois da tentativa",
    );
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .click();
    for (let i = 0; i < count; i++)
      await page
        .locator("form.quiz fieldset")
        .nth(i)
        .getByRole("radio", { name: correct[i], exact: true })
        .check();
    await page
      .getByRole("button", { name: "Entregar avaliação", exact: true })
      .click();
  }
  const certificateLink = page.locator('a[href^="/certificado/"]').first();
  await certificateLink.waitFor();
  const certificatePath = await certificateLink.getAttribute("href");
  expect(
    certificatePath &&
      /^\/certificado\/KVC-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(certificatePath),
    "um certificado deve ser emitido depois de aprovar",
  );
  await page.goto(`${base}${certificatePath}`);
  await page.locator(".certificate").waitFor();
  await shot(page, "certificado");
  await logout(page);
  await page.goto(
    `${base}${certificatePath.replace("/certificado/", "/verificar/")}`,
  );
  await page
    .getByRole("heading", { name: "Certificado válido", exact: true })
    .waitFor();
  await shot(page, "verificacao-publica");

  expect(
    errors.length === 0,
    `Erros de JavaScript nas páginas: ${errors.join("; ")}`,
  );
  console.log("\nSem erros de JavaScript nas páginas.");
  console.log("E2E concluído.");
} catch (error) {
  await page
    .screenshot({ path: ".qa/e2e-failure.png", fullPage: true })
    .catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
