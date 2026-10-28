"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/text";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import {
  authenticate,
  changePassword,
  loginSchema,
  nameSchema,
  passwordSchema,
  registerSchema,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} from "@/server/auth/service";
import { clientIp, endSession, getCurrentSessionId, requireUser, startSession } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { bool, failure, str, success, type ActionState } from "./result";

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const next = safeNextPath(str(form, "next"));
  try {
    const input = loginSchema.parse({ email: str(form, "email"), password: str(form, "password") });
    const user = await authenticate(await getDb(), { ...input, ip: await clientIp() });
    await startSession(user.id);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const next = safeNextPath(str(form, "next"));
  try {
    if (!bool(form, "terms")) throw new DomainError("Para criar conta, aceita os termos e a política de privacidade.", "terms");
    const input = registerSchema.parse({ name: str(form, "name"), email: str(form, "email"), password: str(form, "password") });
    const user = await registerUser(await getDb(), input);
    await startSession(user.id);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect(next === "/aprender" ? "/aprender?bemvindo=1" : next);
}

export async function logoutAction() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requestPasswordReset(await getDb(), str(form, "email"));
  } catch (error) {
    return failure(error);
  }
  return success("Se existir uma conta com este email, enviámos um link para redefinir a palavra-passe. Verifica também a pasta de spam.");
}

export async function resetPasswordAction(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    if (str(form, "password") !== str(form, "confirm")) throw new DomainError("As palavras-passe não coincidem.", "mismatch");
    const userId = await resetPassword(await getDb(), token, str(form, "password"));
    await startSession(userId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  redirect("/aprender?senha=1");
}

const profileSchema = z.object({
  name: nameSchema,
  headline: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
});

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = profileSchema.parse({ name: str(form, "name"), headline: str(form, "headline"), bio: str(form, "bio") });
    await (await getDb())
      .update(users)
      .set({ name: input.name, headline: input.headline || null, bio: input.bio || null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return success("Perfil atualizado.");
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const next = passwordSchema.parse(str(form, "password"));
    if (next !== str(form, "confirm")) throw new DomainError("As palavras-passe não coincidem.", "mismatch");
    await changePassword(await getDb(), user.id, str(form, "current"), next, (await getCurrentSessionId())!);
  } catch (error) {
    return failure(error);
  }
  return success("Palavra-passe alterada. As outras sessões foram terminadas.");
}

export async function resendVerificationAction(_: ActionState): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (user.emailVerifiedAt) return success("O teu email já está confirmado.");
    await sendVerificationEmail(await getDb(), user);
  } catch (error) {
    return failure(error);
  }
  return success("Enviámos um novo link de confirmação.");
}
