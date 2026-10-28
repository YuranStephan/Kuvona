import { eq } from "drizzle-orm";
import { formatMoney } from "@/lib/money";
import { providerLabel } from "@/lib/format";
import type { Db } from "../db/client";
import { courses, users, type Order } from "../db/schema";
import { appUrl, composeEmail, sendEmail } from "../email";

async function context(db: Db, order: Order) {
  const [row] = await db
    .select({ name: users.name, email: users.email, courseTitle: courses.title, courseSlug: courses.slug })
    .from(users)
    .innerJoin(courses, eq(courses.id, order.courseId))
    .where(eq(users.id, order.userId))
    .limit(1);
  return row ?? null;
}

/** Best effort: notifications never undo or block a committed payment change. */
export async function notifyStudent(db: Db, order: Order, kind: "paid" | "failed" | "refunded") {
  try {
    const ctx = await context(db, order);
    if (!ctx) return;
    const amount = formatMoney(order.amountCents, order.currency);
    const content = {
      paid: {
        subject: `Acesso confirmado: ${ctx.courseTitle}`,
        title: "Pagamento confirmado",
        paragraphs: [
          `Olá ${ctx.name}, confirmámos o pagamento de ${amount} (pedido ${order.reference}).`,
          `Já tens acesso completo ao curso "${ctx.courseTitle}". Bons estudos!`,
        ],
        action: { label: "Começar a aprender", url: `${appUrl()}/aprender/${ctx.courseSlug}` },
      },
      failed: {
        subject: `Pagamento não confirmado: ${order.reference}`,
        title: "Não conseguimos confirmar o pagamento",
        paragraphs: [
          `Olá ${ctx.name}, o pedido ${order.reference} (${ctx.courseTitle}) não foi confirmado.`,
          `Motivo: ${order.failureReason ?? "não indicado"}.`,
          "Se o dinheiro saiu da tua carteira, responde a este email com o SMS de confirmação para resolvermos.",
        ],
        action: { label: "Ver o pedido", url: `${appUrl()}/pedidos/${order.reference}` },
      },
      refunded: {
        subject: `Reembolso registado: ${order.reference}`,
        title: "Reembolso registado",
        paragraphs: [
          `Olá ${ctx.name}, registámos o reembolso de ${amount} referente ao curso "${ctx.courseTitle}".`,
          "O acesso associado a esta compra foi encerrado. O teu progresso fica guardado caso voltes a inscrever-te.",
        ],
        action: { label: "Ver os meus pedidos", url: `${appUrl()}/pedidos` },
      },
    }[kind];
    await sendEmail(db, composeEmail(ctx.email, content.subject, content));
  } catch (error) {
    console.error("[payments] falha ao notificar estudante", error);
  }
}

export async function notifyAdminsOfSubmission(db: Db, order: Order) {
  try {
    const ctx = await context(db, order);
    const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
    for (const admin of admins) {
      await sendEmail(
        db,
        composeEmail(admin.email, `Pagamento por verificar: ${order.reference}`, {
          title: "Novo pagamento por verificar",
          paragraphs: [
            `${ctx?.name ?? "Um estudante"} indicou um pagamento ${providerLabel[order.provider]} de ${formatMoney(order.amountCents, order.currency)}.`,
            `Curso: ${ctx?.courseTitle ?? "—"}. ID da transação: ${order.providerReference ?? "—"}. Telemóvel: ${order.payerPhoneMasked ?? "—"}.`,
            "Confirma no extrato da carteira antes de aprovar. Nunca aproves com base numa captura de ecrã.",
          ],
          action: { label: "Abrir a fila de verificação", url: `${appUrl()}/admin/pagamentos/${order.id}` },
        }),
      );
    }
  } catch (error) {
    console.error("[payments] falha ao notificar a gestão", error);
  }
}
