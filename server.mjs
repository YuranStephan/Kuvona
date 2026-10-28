import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

export function permittedPath(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
  if (pathname === "/") return "index.html";
  if (pathname === "/index.html" || pathname === "/favicon.svg")
    return pathname.slice(1);
  if (
    !/^\/src\/[a-zA-Z0-9/_-]+\.(js|css|svg|txt)$/.test(pathname) ||
    pathname.includes("..")
  )
    return null;
  return pathname.slice(1);
}

export const server = http.createServer(async (request, response) => {
  const name = permittedPath(request.url);
  if (!name || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  try {
    const body = await readFile(path.join(root, name));
    response.writeHead(200, {
      "Content-Type": mime[path.extname(name)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Kuvona-Version": "2",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; connect-src 'self' https://www.youtube.com; object-src 'none'; base-uri 'self'; form-action 'self'",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `A porta ${port} já está em uso. Abre http://localhost:${port} ou define PORT=8001.`
        : error.message,
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `Academia Kuvona · http://localhost:${port}\nCtrl+C para encerrar.`,
    ),
  );
}
