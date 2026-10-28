import test from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.mjs";

test("HTTP server serves the app with correct headers and excludes workspace files", async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(origin);
    assert.equal(home.status, 200);
    assert.equal(home.headers.get("X-Kuvona-Version"), "2");
    assert.match(home.headers.get("Content-Type"), /text\/html/);
    assert.match(
      home.headers.get("Content-Security-Policy"),
      /script-src 'self'/,
    );
    assert.ok((await home.text()).includes("Academia Kuvona"));
    const script = await fetch(origin + "/src/app.js");
    assert.match(script.headers.get("Content-Type"), /javascript/);
    for (const path of [
      "/int.txt",
      "/AGENTS.md",
      "/README.md",
      "/.env",
      "/package.json",
    ]) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    assert.equal((await fetch(origin, { method: "POST" })).status, 404);
    const head = await fetch(origin, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
