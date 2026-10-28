import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const files = [
  "server.mjs",
  ...(await readdir("src"))
    .filter((n) => n.endsWith(".js"))
    .map((n) => path.join("src", n)),
  ...(await readdir("scripts"))
    .filter((n) => n.endsWith(".mjs"))
    .map((n) => path.join("scripts", n)),
];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(1);
  }
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/from ['"](\.[^'"]+)['"]/g))
    await readFile(path.resolve(path.dirname(file), match[1]));
}
console.log(`Syntax and local imports OK (${files.length} files).`);
