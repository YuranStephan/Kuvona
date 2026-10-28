"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
import { enrollFree } from "@/server/enrollment/service";
import { toggleWishlist } from "@/server/catalog/queries";
import { cancelOrder, createOrder, submitManualPayment } from "@/server/payments/orders";
import { simulateSandboxOutcome } from "@/server/payments/sandbox";
import { upsertReview } from "@/server/learning/community";
import { DomainError } from "@/server/errors";
import { bool, failure, str, success, type ActionState } from "./result";

const providerSchema = z.enum(["manual_mpesa", "manual_emola", "sandbox"], { error: "Escolhe um método de pagamento." });

export async function enrollFreeAction(courseId: string, slug: string, _: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    await enrollFree(await getDb(), user.id, courseId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(`/aprender/${slug}`);
}

export async function toggleWishlistAction(courseId: string) {
  const user = await requireUser();
  await toggleWishlist(await getDb(), user.id, courseId);
  revalidatePath("/", "layout");
}

export async function createOrderAction(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  let reference: string;
  try {
    const user = await requireUser();
    if (!bool(form, "terms")) throw new DomainError("Aceita os termos e a política de reembolso para continuar.", "terms");
    const provider = providerSchema.parse(str(form, "provider") || undefined);
    // Price, currency and course come from the database inside createOrder — never from this form.
    const { order } = await createOrder(await getDb(), { userId: user.id, courseId, provider });
    reference = order.reference;
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(`/pedidos/${reference}`);
}

export async function submitPaymentAction(orderId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    await submitManualPayment(await getDb(), {
      userId: user.id,
      orderId,
      transactionId: str(form, "transactionId"),
      phone: str(form, "phone"),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Recebemos os dados do pagamento. Vamos confirmar no extrato e avisamos-te por email.");
}

export async function cancelOrderAction(orderId: string, _: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    await cancelOrder(await getDb(), { userId: user.id, orderId });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Pedido cancelado.");
}

export async function simulateAction(orderId: string, outcome: "success" | "failed", _: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    await simulateSandboxOutcome(await getDb(), { orderId, userId: user.id, outcome });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success();
}

export async function reviewAction(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    await upsertReview(await getDb(), user, courseId, { rating: Number(str(form, "rating")), body: str(form, "body") });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Obrigado! A tua avaliação foi publicada.");
}
