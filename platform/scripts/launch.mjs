import { spawn, execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const platformRoot = fileURLToPath(new URL("../", import.meta.url));
const address = "http://localhost:3100";
const noOpen = process.argv.includes("--no-open");
const checkOnly = process.argv.includes("--check");
let child;
let lock;
const lockPath = path.join(platformRoot, ".data", "launcher.lock");

function npm(args) {
  // Only fixed commands from this file are accepted; no user input reaches a shell.
  return process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], {
        cwd: platformRoot,
        stdio: "inherit",
        windowsHide: true,
      })
    : spawn("npm", args, { cwd: platformRoot, stdio: "inherit" });
}
async function run(args) {
  child = npm(args);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
  child = undefined;
  if (code !== 0)
    throw new Error(`npm ${args.join(" ")} terminou com erro (${code}).`);
}
async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
async function latestSource() {
  let latest = 0;
  const inspect = async (file) => {
    try {
      const stat = await fs.stat(file);
      if (stat.isDirectory()) {
        for (const name of await fs.readdir(file))
          await inspect(path.join(file, name));
      } else latest = Math.max(latest, stat.mtimeMs);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  for (const file of [
    "src",
    "public",
    "drizzle",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
  ])
    await inspect(path.join(platformRoot, file));
  return latest;
}
async function buildState() {
  const buildFile = path.join(platformRoot, ".next", "BUILD_ID");
  const installed = await exists(path.join(platformRoot, "node_modules"));
  const buildTime = await fs
    .stat(buildFile)
    .then((s) => s.mtimeMs)
    .catch(() => 0);
  const sourceTime = await latestSource();
  return {
    node: process.versions.node,
    installed,
    hasProductionBuild: buildTime > 0,
    needsBuild: !buildTime || sourceTime > buildTime,
  };
}
async function probe() {
  try {
    const response = await fetch(`${address}/entrar`, {
      signal: AbortSignal.timeout(4000),
      redirect: "manual",
    });
    const html = await response.text();
    return {
      occupied: true,
      kuvona: response.ok && html.includes("Academia Kuvona"),
    };
  } catch {
    const occupied = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port: 3100 });
      socket.setTimeout(700);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => {
        socket.destroy();
        resolve(true);
      });
    });
    return { occupied, kuvona: false };
  }
}
function browser() {
  if (noOpen) return;
  const command =
    process.platform === "win32"
      ? ["cmd.exe", ["/d", "/s", "/c", `start "" "${address}"`]]
      : process.platform === "darwin"
        ? ["open", [address]]
        : ["xdg-open", [address]];
  const opener = spawn(command[0], command[1], {
    windowsHide: true,
    stdio: "ignore",
  });
  opener.on("error", () => console.log(`Abre ${address} no navegador.`));
}
async function acquireLock() {
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  try {
    lock = await fs.open(lockPath, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(await fs.readFile(lockPath, "utf8"));
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch (error) {
      alive = error.code !== "ESRCH";
    }
    if (!Number.isSafeInteger(pid) || pid <= 0 || alive)
      throw new Error(
        "Já existe um arranque em curso. Aguarda e abre http://localhost:3100. Não abras outra base PGlite.",
      );
    await fs.unlink(lockPath);
    lock = await fs.open(lockPath, "wx");
  }
  await lock.writeFile(String(process.pid));
}
async function releaseLock() {
  if (lock) {
    await lock.close();
    lock = undefined;
    await fs.unlink(lockPath).catch(() => {});
  }
}
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (child?.pid) {
    if (process.platform === "win32")
      await new Promise((resolve) =>
        execFile(
          "taskkill",
          ["/pid", String(child.pid), "/t", "/f"],
          { windowsHide: true },
          resolve,
        ),
      );
    else child.kill("SIGTERM");
  }
  await releaseLock();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function main() {
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new Error("Instala Node.js 22 ou superior antes de abrir a Kuvona.");
  if (checkOnly) {
    console.log(
      JSON.stringify(
        { ...(await buildState()), server: await probe(), url: address },
        null,
        2,
      ),
    );
    return;
  }
  const current = await probe();
  if (current.kuvona) {
    console.log(
      `A Kuvona já está em execução: ${address}. Vou reutilizar esse servidor sem abrir outra base de dados.`,
    );
    browser();
    return;
  }
  if (current.occupied)
    throw new Error(
      "A porta 3100 está ocupada ou ainda não responde como Kuvona. Aguarda o arranque existente ou fecha a aplicação responsável; não vou iniciar uma segunda base PGlite.",
    );
  await acquireLock();
  const state = await buildState();
  if (!state.installed) {
    console.log("A instalar as dependências da plataforma…");
    await run(["install"]);
  }
  if (state.needsBuild) {
    console.log(
      "A preparar a versão de produção. O primeiro arranque pode demorar alguns minutos…",
    );
    await run(["run", "build"]);
  }
  const beforeStart = await probe();
  if (beforeStart.occupied)
    throw new Error(
      "A porta 3100 foi ocupada durante a preparação. Não foi iniciado outro servidor. Abre o arranque existente.",
    );
  console.log(
    `A abrir a Kuvona em ${address}. Mantém esta janela aberta; Ctrl+C para encerrar.`,
  );
  child = npm(["start"]);
  const running = child;
  let exited = false;
  const completion = new Promise((resolve, reject) => {
    running.once("error", reject);
    running.once("exit", (code) => {
      exited = true;
      resolve(code ?? 1);
    });
  });
  let ready = false;
  for (let i = 0; i < 90 && !exited; i++) {
    if ((await probe()).kuvona) {
      ready = true;
      console.log(`Pronto: ${address}`);
      browser();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready && !exited)
    console.error(
      `O servidor ainda não respondeu. Consulta o erro nesta janela antes de abrir novamente. Endereço: ${address}`,
    );
  const code = await completion;
  child = undefined;
  if (code !== 0) throw new Error(`O servidor terminou com erro (${code}).`);
}
main()
  .catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  })
  .finally(releaseLock);
