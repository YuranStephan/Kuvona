// Visual QA: node scripts/shot.mjs <path> [more paths…] [--mobile] [--login=email:password]
// Saves full-page screenshots to .qa/ using the locally installed Chrome/Edge.
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const fold = args.includes("--fold");
const login = args.find((a) => a.startsWith("--login="))?.slice(8);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const paths = args.filter((a) => !a.startsWith("--"));
const executablePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => p && existsSync(p));

mkdirSync(".qa", { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext(
  mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
);
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

if (login) {
  const [email, password] = login.split(":");
  await page.goto(`${base}/entrar`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60_000 }), page.click('button[type="submit"]')]);
}

for (const p of paths) {
  const res = await page.goto(base + p, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(900);
  const name = `${p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}${mobile ? "-mobile" : ""}${fold ? "-fold" : ""}.png`;
  await page.screenshot({ path: `.qa/${name}`, fullPage: !fold });
  console.log(`${res?.status()} ${p} → .qa/${name}`);
}
if (errors.length) console.log("Console errors:\n" + errors.map((e) => "  " + e).join("\n"));
await browser.close();
