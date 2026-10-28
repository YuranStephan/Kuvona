import type { Executor } from "./db/client";
import { auditEvents } from "./db/schema";

export async function audit(
  db: Executor,
  event: { actorId: string | null; action: string; entityType: string; entityId?: string | null; data?: Record<string, unknown> },
) {
  await db.insert(auditEvents).values({
    actorId: event.actorId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    data: event.data ?? {},
  });
}
