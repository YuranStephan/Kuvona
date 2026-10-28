import { sandboxEnabled } from "@/server/config";
import { getDb } from "@/server/db/client";
import { processSandboxWebhook } from "@/server/payments/sandbox";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sandboxEnabled())
    return Response.json({ ok: false, result: "disabled" }, { status: 404 });
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > 16_384)
    return Response.json(
      { ok: false, result: "payload_too_large" },
      { status: 413 },
    );
  const { body, status } = await processSandboxWebhook(
    await getDb(),
    raw,
    req.headers.get("x-kuvona-signature"),
  );
  return Response.json(body, { status });
}
