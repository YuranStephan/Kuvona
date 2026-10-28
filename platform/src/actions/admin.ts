"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/text";
import { getDb } from "@/server/db/client";
import { categories, courses } from "@/server/db/schema";
import { requireRole } from "@/server/auth/session";
import {
  confirmOrder,
  refundOrder,
  rejectOrder,
} from "@/server/payments/orders";
import {
  publishCourse,
  reassignInstructor,
  requestChanges,
  setCourseStatus,
  setFeatured,
} from "@/server/catalog/editor";
import {
  changeRole,
  grantCourse,
  revokeCourse,
  setUserDisabled,
} from "@/server/admin/users";
import {
  decideApplication,
  setReviewHidden,
} from "@/server/learning/community";
import { setSetting } from "@/server/settings";
import { audit } from "@/server/audit";
import { DomainError, isUniqueViolation } from "@/server/errors";
import { bool, failure, str, success, type ActionState } from "./result";

const admin = () => requireRole("admin");
const done = () => revalidatePath("/", "layout");

// ─── Payments ────────────────────────────────────────────────────────────────

export async function confirmOrderAction(
  orderId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await admin();
    if (!bool(form, "checked"))
      throw new DomainError(
        "Confirma que verificaste a transação no extrato da carteira.",
        "unchecked",
      );
    await confirmOrder(await getDb(), {
      orderId,
      actorId: actor.id,
      providerReference: str(form, "providerReference") || null,
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    "Pagamento confirmado. O estudante já tem acesso e foi notificado.",
  );
}

export async function rejectOrderAction(
  orderId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await rejectOrder(await getDb(), {
      orderId,
      actorId: (await admin()).id,
      reason: str(form, "reason"),
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    "Pagamento recusado. O estudante foi notificado com o motivo.",
  );
}

export async function refundOrderAction(
  orderId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await refundOrder(await getDb(), {
      orderId,
      actorId: (await admin()).id,
      reason: str(form, "reason"),
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Reembolso registado. O acesso desta compra foi encerrado.");
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export async function publishCourseAction(
  courseId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await publishCourse(await getDb(), await admin(), courseId);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Curso publicado na loja.");
}

export async function requestChangesAction(
  courseId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requestChanges(
      await getDb(),
      await admin(),
      courseId,
      str(form, "note"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Pedido de alterações enviado ao instrutor.");
}

export async function setCourseStatusAction(
  courseId: string,
  status: "draft" | "archived",
  _: ActionState,
): Promise<ActionState> {
  try {
    await setCourseStatus(await getDb(), await admin(), courseId, status);
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    status === "draft"
      ? "Curso retirado da loja. Os inscritos mantêm o acesso."
      : "Curso arquivado.",
  );
}

export async function toggleFeaturedAction(
  courseId: string,
  featured: boolean,
) {
  await setFeatured(await getDb(), await admin(), courseId, featured);
  done();
}

export async function reassignInstructorAction(
  courseId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await reassignInstructor(
      await getDb(),
      await admin(),
      courseId,
      str(form, "instructorId"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Instrutor atualizado.");
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function changeRoleAction(
  userId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const role = str(form, "role");
    if (role !== "student" && role !== "instructor" && role !== "admin")
      throw new DomainError("Papel inválido.", "invalid");
    await changeRole(await getDb(), await admin(), userId, role);
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Papel atualizado.");
}

export async function setUserDisabledAction(
  userId: string,
  disabled: boolean,
  _: ActionState,
): Promise<ActionState> {
  try {
    await setUserDisabled(await getDb(), await admin(), userId, disabled);
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    disabled ? "Conta desativada e sessões terminadas." : "Conta reativada.",
  );
}

export async function grantCourseAction(
  userId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await grantCourse(
      await getDb(),
      await admin(),
      userId,
      str(form, "courseId"),
      str(form, "reason"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Acesso concedido.");
}

export async function revokeCourseAction(
  userId: string,
  courseId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await revokeCourse(
      await getDb(),
      await admin(),
      userId,
      courseId,
      str(form, "reason"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Acesso revogado.");
}

export async function decideApplicationAction(
  applicationId: string,
  approve: boolean,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await decideApplication(
      await getDb(),
      await admin(),
      applicationId,
      approve,
      str(form, "note"),
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    approve
      ? "Candidatura aprovada. A conta já pode criar cursos."
      : "Candidatura recusada.",
  );
}

export async function setReviewHiddenAction(reviewId: string, hidden: boolean) {
  await setReviewHidden(await getDb(), await admin(), reviewId, hidden);
  done();
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function saveContentSettingsAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await admin();
    const db = await getDb();
    const questions = form.getAll("homeFaq.a");
    const answers = form.getAll("homeFaq.b");
    const homeFaq = questions
      .map((q, i) => ({
        q: typeof q === "string" ? q.trim() : "",
        a: typeof answers[i] === "string" ? (answers[i] as string).trim() : "",
      }))
      .filter((item) => item.q || item.a);
    await setSetting(
      db,
      "content",
      {
        heroTitle: str(form, "heroTitle"),
        heroSubtitle: str(form, "heroSubtitle"),
        homeFaq,
        aboutTitle: str(form, "aboutTitle"),
        aboutIntro: str(form, "aboutIntro"),
        aboutBody: str(form, "aboutBody"),
        terms: str(form, "terms"),
        privacy: str(form, "privacy"),
        refunds: str(form, "refunds"),
      },
      actor.id,
    );
    await audit(db, {
      actorId: actor.id,
      action: "settings.content",
      entityType: "settings",
      entityId: "content",
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success(
    "Conteúdos atualizados. As páginas públicas já apresentam as alterações.",
  );
}

export async function savePaymentSettingsAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await admin();
    const db = await getDb();
    await setSetting(
      db,
      "payments",
      {
        mpesa: {
          number: str(form, "mpesaNumber"),
          accountName: str(form, "mpesaName"),
        },
        emola: {
          number: str(form, "emolaNumber"),
          accountName: str(form, "emolaName"),
        },
        instructions: str(form, "instructions"),
        orderTtlHours: Number(str(form, "orderTtlHours") || "48"),
      },
      actor.id,
    );
    await audit(db, {
      actorId: actor.id,
      action: "settings.payments",
      entityType: "settings",
      entityId: "payments",
    });
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Definições de pagamento guardadas.");
}

export async function saveSchoolSettingsAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await admin();
    await setSetting(
      await getDb(),
      "school",
      {
        supportEmail: str(form, "supportEmail"),
        supportPhone: str(form, "supportPhone"),
        legalName: str(form, "legalName"),
        nuit: str(form, "nuit"),
        whatsapp: str(form, "whatsapp"),
        whatsappGreeting: str(form, "whatsappGreeting") || undefined,
      },
      actor.id,
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Dados da academia guardados.");
}

export async function savePartnersAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await admin();
    const names = str(form, "names")
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);
    await setSetting(
      await getDb(),
      "partners",
      {
        heading: str(form, "heading") || undefined,
        names,
        isDemo: bool(form, "isDemo"),
      },
      actor.id,
    );
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Parceiros atualizados.");
}

export async function addCategoryAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const name = str(form, "name").trim().slice(0, 60);
    if (name.length < 2)
      throw new DomainError("Indica o nome da categoria.", "invalid");
    await (await getDb())
      .insert(categories)
      .values({
        name,
        slug: slugify(name),
        description: str(form, "description").trim().slice(0, 200),
        position: 99,
      });
  } catch (error) {
    if (isUniqueViolation(error))
      return failure(
        new DomainError("Já existe uma categoria com esse nome.", "duplicate"),
      );
    return failure(error);
  }
  done();
  return success("Categoria criada.");
}

export async function deleteCategoryAction(
  categoryId: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    await admin();
    const db = await getDb();
    const [used] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.categoryId, categoryId))
      .limit(1);
    if (used)
      throw new DomainError(
        "Há cursos nesta categoria. Muda-os de categoria antes de a apagar.",
        "in_use",
      );
    await db.delete(categories).where(eq(categories.id, categoryId));
  } catch (error) {
    return failure(error);
  }
  done();
  return success("Categoria apagada.");
}
