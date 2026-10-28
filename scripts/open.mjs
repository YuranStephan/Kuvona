import { spawn } from "node:child_process";
import { server } from "../server.mjs";

const port = Number(process.env.PORT || 8000);
const url = `http://localhost:${port}`;
function openBrowser() {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/c", "start", "", url], {
          windowsHide: true,
          stdio: "ignore",
        })
      : process.platform === "darwin"
        ? spawn("open", [url], { stdio: "ignore" })
        : spawn("xdg-open", [url], { stdio: "ignore" });
  child.on("error", () => console.log(`Abre ${url} no navegador.`));
}
server.on("error", async (error) => {
  if (error.code === "EADDRINUSE") {
    try {
      const response = await fetch(url);
      await response.text();
      if (response.ok && response.headers.get("X-Kuvona-Version") === "2") {
        console.log(`A Kuvona já está aberta em ${url}`);
        openBrowser();
        return;
      }
    } catch {}
    console.error(
      `A porta ${port} está ocupada por outra aplicação. Usa outra porta: $env:PORT=8001; npm start`,
    );
  } else console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(
    `Academia Kuvona · ${url}\nMantém esta janela aberta. Ctrl+C para encerrar.`,
  );
  openBrowser();
});
