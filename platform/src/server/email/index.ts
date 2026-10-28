import { eq } from "drizzle-orm";
import type { Executor } from "../db/client";
import { emailOutbox } from "../db/schema";

export type Email = { to: string; subject: string; text: string; html: string };

export const emailProvider = () => (process.env.RESEND_API_KEY ? "resend" : "outbox");
export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3100").replace(/\/$/, "");

/**
 * Records every email in the outbox. With RESEND_API_KEY it is also delivered through Resend;
 * otherwise it stays in the outbox (visible in Gestão → Emails) for local use.
 */
export async function sendEmail(db: Executor, email: Email) {
  const provider = emailProvider();
  const [row] = await db
    .insert(emailOutbox)
    .values({ toEmail: email.to, subject: email.subject, text: email.text, html: email.html, provider })
    .returning({ id: emailOutbox.id });
  if (provider === "outbox") {
    if (process.env.NODE_ENV === "development") console.info(`[email] → ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Academia Kuvona <onboarding@resend.dev>",
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`);
    await db.update(emailOutbox).set({ sentAt: new Date(), providerId: body.id ?? null }).where(eq(emailOutbox.id, row!.id));
  } catch (error) {
    // Email failure must never break the user action that triggered it; it stays visible in the outbox.
    await db
      .update(emailOutbox)
      .set({ error: error instanceof Error ? error.message.slice(0, 500) : "erro desconhecido" })
      .where(eq(emailOutbox.id, row!.id));
  }
}

const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => entities[c] ?? c);

type Content = { title: string; paragraphs: string[]; action?: { label: string; url: string } };

/** Minimal branded layout. All values are escaped; `action.url` must be an absolute app URL. */
function layout(opts: Content) {
  const button = opts.action
    ? `<p style="margin:28px 0"><a href="${escape(opts.action.url)}" style="background:#15130F;color:#F5F0E6;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escape(opts.action.label)}</a></p><p style="color:#6b645a;font-size:13px">Se o botão não funcionar, copia este endereço: ${escape(opts.action.url)}</p>`
    : "";
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#F5F0E6;font-family:Georgia,serif;color:#15130F">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#E4572E;font-family:Arial,sans-serif;font-weight:700">Academia Kuvona</p>
<h1 style="font-size:28px;line-height:1.2;font-weight:600">${escape(opts.title)}</h1>
${opts.paragraphs.map((p) => `<p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${escape(p)}</p>`).join("")}
${button}
<hr style="border:none;border-top:1px solid #ddd3c4;margin:32px 0"><p style="font-family:Arial,sans-serif;font-size:12px;color:#6b645a">Recebeste este email porque tens uma conta na Academia Kuvona.</p>
</div></body></html>`;
}

function textOf(opts: Content) {
  return [opts.title, "", ...opts.paragraphs, ...(opts.action ? ["", `${opts.action.label}: ${opts.action.url}`] : [])].join("\n");
}

export function composeEmail(to: string, subject: string, content: Content): Email {
  return { to, subject, html: layout(content), text: textOf(content) };
}
