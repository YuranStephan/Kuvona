// Real Chromium smoke tests without third-party dependencies. Uses a fresh, disposable profile.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { server } from "../server.mjs";

const executable =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].find(existsSync);
if (!executable)
  throw Error(
    "Chrome/Chromium não encontrado. Define CHROME_PATH para executar os testes de navegador.",
  );
const temp = await mkdtemp(path.join(os.tmpdir(), "kuvona-qa-"));
const debugPort = 9400 + Math.floor(Math.random() * 500);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(
  executable,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${temp}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
try {
  let info;
  for (let i = 0; i < 60; i++) {
    try {
      info = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
        method: "PUT",
      }).then((r) => r.json());
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (!info?.webSocketDebuggerUrl) throw Error("O navegador não iniciou.");
  socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let seq = 0;
  const pending = new Map(),
    errors = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
    if (
      message.method === "Log.entryAdded" &&
      message.params.entry.source === "security" &&
      message.params.entry.level === "error"
    )
      errors.push(message.params.entry.text);
    if (message.id) {
      const p = pending.get(message.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(message.id);
      message.error
        ? p.reject(Error(message.error.message))
        : p.resolve(message.result);
    }
  };
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq,
        timer = setTimeout(() => {
          pending.delete(id);
          reject(Error(`CDP timeout: ${method}`));
        }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text,
      );
    return r.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 60; i++) {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error("Timed out: " + expression);
  };
  const click = (selector) =>
    evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const submit = async (selector, values) =>
    evaluate(
      `{const form=document.querySelector(${JSON.stringify(selector)});for(const [name,value] of Object.entries(${JSON.stringify(values)})){form.elements.namedItem(name).value=value}form.requestSubmit()}`,
    );
  const navigate = async (hash) => {
    await evaluate(`location.hash=${JSON.stringify(hash)}`);
    await new Promise((r) => setTimeout(r, 120));
    await waitFor(`document.querySelector('#main')`);
  };
  await command("Runtime.enable");
  await command("Page.enable");
  await command("Log.enable");
  await command("Page.navigate", { url: origin });
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(`document.querySelector('.store-hero')`);
  await mkdir(".qa", { recursive: true });
  async function screenshot(name) {
    const image = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(`.qa/${name}.png`, Buffer.from(image.data, "base64"));
  }
  await new Promise((r) => setTimeout(r, 600));
  await screenshot("desktop");
  assert.equal(
    await evaluate(`document.querySelectorAll('.course-card').length`),
    7,
  );
  await navigate("catalog");
  assert.equal(
    await evaluate(`document.querySelectorAll('.course-card').length`),
    6,
  );
  assert.equal(
    await evaluate(
      `document.querySelectorAll('[data-action="enroll"]').length`,
    ),
    0,
  );
  await click('[data-action="market-page"][data-value="2"]');
  assert.equal(
    await evaluate(
      `document.querySelectorAll('.catalog-results .market-card').length`,
    ),
    2,
  );
  await click('.market-card[data-id="python"] .market-card-body p');
  await waitFor(`document.querySelector('#course-objectives')`);
  assert.equal(await evaluate(`location.hash`), "#course/python");
  await navigate("checkout/python");
  assert.equal(
    await evaluate(`!!document.querySelector('[data-form="checkout"]')`),
    false,
  );
  await navigate("catalog");
  await screenshot("catalog");
  await evaluate(
    `const input=document.querySelector('#catalog-search');input.value='design';input.dispatchEvent(new Event('input',{bubbles:true}))`,
  );
  assert.equal(
    await evaluate(`document.querySelectorAll('.course-card').length`),
    1,
  );
  await click('[data-action="favorite"]');
  await navigate("favorites");
  assert.equal(
    await evaluate(`document.querySelectorAll('.course-card').length`),
    1,
  );
  await navigate("course/business");
  await screenshot("course-details");
  assert.equal(
    await evaluate(
      `!!document.querySelector('#course-requirements') && !!document.querySelector('#course-instructor') && !!document.querySelector('#course-curriculum')`,
    ),
    true,
  );
  await click('[data-action="course-preview"]');
  assert.equal(
    await evaluate(`document.querySelector('.preview-article h3').textContent`),
    "Começa pelo problema",
  );
  assert.equal(
    await evaluate(
      `document.querySelectorAll('#modal [data-action="enroll"]').length`,
    ),
    0,
  );
  await click('[data-action="close"]');
  await click('[data-action="enroll"]');
  await waitFor(`document.querySelector('[data-form="checkout"]')`);
  await screenshot("checkout");
  await evaluate(
    `document.querySelector('#payment-phone').value='841234567';document.querySelector('[data-form="checkout"] input[type=checkbox]').checked=true;document.querySelector('[data-form="checkout"]').requestSubmit()`,
  );
  await waitFor(`document.querySelector('[data-status="confirmed"]')`);
  await click('[data-status="confirmed"]');
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).enrollments.includes('business')`,
    ),
    true,
  );
  assert.equal(
    await evaluate(`!!document.querySelector('.purchase-result')`),
    true,
  );
  await navigate("learn/business/biz-1");
  for (const lid of ["biz-1", "biz-2", "biz-3"]) {
    await navigate("learn/business/" + lid);
    await click('[data-action="complete"]');
  }
  await navigate("course/business");
  await click('[data-action="course-review"]');
  await submit('[data-form="course-review"]', {
    rating: "4",
    "review-text": "Aprendi a planear uma experiência com clareza.",
  });
  assert.equal(
    await evaluate(`document.querySelector('.public-review p').textContent`),
    "Aprendi a planear uma experiência com clareza.",
  );
  await navigate("assessment/business");
  await waitFor(`document.querySelector('[data-form="assessment"]')`);
  await evaluate(
    `document.querySelector('[name=q0][value="1"]').checked=true;document.querySelector('[name=q1][value="0"]').checked=true;document.querySelector('[name=q2][value="2"]').checked=true;document.querySelector('[data-form="assessment"]').requestSubmit()`,
  );
  assert.equal(
    await evaluate(`document.querySelector('.score').textContent`),
    "100%",
  );
  await navigate("certificates");
  await click('[data-action="certificate"]');
  assert.ok(
    await evaluate(
      `document.querySelector('.certificate-preview').textContent.includes('Estudante')`,
    ),
  );
  await screenshot("certificate");
  await click('[data-action="close"]');
  await navigate("learn/web/web-1");
  await click('[data-action="lesson-tab"][data-value="notes"]');
  await evaluate(
    `document.querySelector('#lesson-notes').value='Nota de teste';document.querySelector('#lesson-notes').dispatchEvent(new Event('input',{bubbles:true}))`,
  );
  await command("Page.reload");
  await waitFor(`document.querySelector('.lesson-sidebar')`);
  await click('[data-action="lesson-tab"][data-value="notes"]');
  assert.equal(
    await evaluate(`document.querySelector('#lesson-notes').value`),
    "Nota de teste",
  );
  await navigate("admin");
  await click('[data-action="admin-tab"][data-value="payments"]');
  await click('[data-action="refund"]');
  await click('[data-action="refund-confirm"]');
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).enrollments.includes('business')`,
    ),
    false,
  );
  await navigate("learn/business/biz-1");
  assert.equal(
    await evaluate(`!!document.querySelector('.lesson-sidebar')`),
    false,
  );
  await navigate("course/career");
  await click('[data-action="enroll"]');
  await waitFor(`document.querySelector('.purchase-result')`);
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).enrollments.includes('career')`,
    ),
    true,
  );
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).orders.length`,
    ),
    1,
  );
  // Authoring and support are real local flows, not decorative buttons.
  await navigate("admin");
  await click('[data-action="course-new"]');
  await submit('[data-form="course-editor"]', {
    title: "Curso de teste",
    subtitle: "Um percurso de QA",
    description: "Conteúdo para testar o editor.",
    category: "Qualidade",
    price: "0",
    instructor: "Equipa Teste",
    outcomes: "Aprender a verificar\nPraticar",
    lessonTitle: "Primeira aula",
    lessonContent: "Uma aula com conteúdo de demonstração.",
    lessonTask: "Faz uma pequena experiência.",
    question: "Qual é a resposta?",
    correct: "A primeira",
    option2: "A segunda",
    option3: "A terceira",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.length`,
    ),
    9,
  );
  const authored = await evaluate(
    `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.at(-1).id`,
  );
  await click(`[data-action="lesson-editor-list"][data-id="${authored}"]`);
  await click('[data-action="lesson-add"]');
  await submit('[data-form="lesson-editor"]', {
    title: "Mais uma aula",
    module: "02 · Praticar",
    content: "Conteúdo da segunda aula.",
    task: "Pratica uma vez.",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.at(-1).lessons.length`,
    ),
    2,
  );
  await click(`[data-action="quiz-editor-list"][data-id="${authored}"]`);
  await click('[data-action="quiz-edit"][data-index="-1"]');
  await submit('[data-form="quiz-editor"]', {
    question: "A segunda pergunta",
    options: "Sim\nNão",
    correct: "1",
    explanation: "A resposta é sim.",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.at(-1).quiz.length`,
    ),
    2,
  );
  await click(`[data-action="resource-editor-list"][data-id="${authored}"]`);
  await click('[data-action="resource-edit"]');
  await submit('[data-form="resource-editor"]', {
    title: "Checklist de teste",
    text: "Primeiro passo\nSegundo passo",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.at(-1).resources.length`,
    ),
    1,
  );
  await navigate("planner");
  const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await submit('[data-form="schedule"]', {
    courseId: "web",
    date: future,
    time: "18:00",
    minutes: "25",
  });
  await click('[data-action="session-toggle"]');
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).schedule[0].done`,
    ),
    true,
  );
  await navigate("help");
  await submit('[data-form="ticket"]', {
    subject: "Ajuda de teste",
    message: "Como funciona esta aula?",
  });
  await navigate("admin");
  await click('[data-action="admin-tab"][data-value="support"]');
  await submit('[data-form="ticket-reply"]', {
    reply: "Abre a sala de aula e segue o percurso.",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).tickets[0].status`,
    ),
    "resolved",
  );
  await navigate("settings");
  await submit('[data-form="profile"]', {
    name: "Estudante",
    email: "demo@example.test",
    phone: "",
    bio: "A aprender todos os dias.",
  });
  const backup = await evaluate(`localStorage.getItem('kuvona-v2')`);
  await writeFile(".qa/restore.json", backup);
  await command("DOM.enable");
  const documentNode = await command("DOM.getDocument");
  const fileNode = await command("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: "#import-file",
  });
  await command("DOM.setFileInputFiles", {
    nodeId: fileNode.nodeId,
    files: [path.resolve(".qa/restore.json")],
  });
  await waitFor(`document.querySelector('[data-action="restore-confirm"]')`);
  await click('[data-action="restore-confirm"]');
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.length`,
    ),
    9,
  );
  await navigate("dashboard");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 350));
  await screenshot("mobile");
  assert.equal(
    await evaluate(`document.documentElement.scrollWidth>innerWidth`),
    false,
  );
  await click('[data-action="theme"]');
  await screenshot("mobile-dark");
  for (const screen of [
    "home",
    "course/business",
    "instructor/Equipa%20Kuvona",
    "checkout/python",
    "teach",
    "about",
    "catalog",
    "courses",
    "favorites",
    "planner",
    "certificates",
    "payments",
    "settings",
    "help",
    "admin",
  ]) {
    await navigate(screen);
    assert.equal(
      await evaluate(`document.documentElement.scrollWidth>innerWidth`),
      false,
      `Horizontal overflow: ${screen}`,
    );
  }
  await navigate("home");
  await screenshot("marketplace-mobile");
  await navigate("course/business");
  await screenshot("course-mobile");
  await click('[data-action="course-preview"]');
  await screenshot("preview-mobile");
  await click('[data-action="close"]');
  await navigate("course/business");
  await click('[data-action="enroll"]');
  await waitFor(`document.querySelector('[data-form="checkout"]')`);
  assert.equal(
    await evaluate(`document.documentElement.scrollWidth>innerWidth`),
    false,
    "Mobile checkout overflow",
  );
  await screenshot("checkout-mobile");
  await navigate("teach");
  await submit('[data-form="teach-proposal"]', {
    name: "Proponente de teste",
    email: "test@example.test",
    topic: "Uma nova competência",
    proposal:
      "Um percurso prático para quem está a aprender uma nova competência.",
  });
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).tickets[0].subject`,
    ),
    "Proposta de curso: Uma nova competência",
  );
  await click('[data-action="close"]');
  await navigate("settings");
  await click('[data-action="reset"]');
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.length`,
    ),
    9,
  );
  await click('[data-action="reset-confirm"]');
  await navigate("home");
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('kuvona-v2')).catalog.length`,
    ),
    8,
  );
  await screenshot("marketplace-mobile");
  await navigate("course/business");
  await screenshot("course-mobile");
  await click('[data-action="course-preview"]');
  await screenshot("preview-mobile");
  await click('[data-action="close"]');
  await click('[data-action="enroll"]');
  await waitFor(`document.querySelector('[data-form="checkout"]')`);
  await screenshot("checkout-mobile");

  assert.deepEqual(errors, []);
  console.log(
    "Browser OK: storefront, course cards to details, pagination, preview, checkout entry guard, free enrollment, local reviews, instructor pages, teacher proposal, search, favorites, simulated checkout, lessons, assessment, certificate, notes persistence, refund/access, course/lesson/quiz/resource editors, planner, support/reply, profile, backup import, desktop/mobile and dark theme.",
  );
  console.log(
    "Screenshots: .qa/desktop.png, .qa/mobile.png, .qa/mobile-dark.png, .qa/certificate.png. YouTube playback is not exercised by this offline smoke test.",
  );
} finally {
  socket?.close();
  browser.kill();
  await new Promise((r) => server.close(r));
}
