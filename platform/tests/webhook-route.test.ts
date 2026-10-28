import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/payments/webhooks/sandbox/route";
import { setDbForTesting, type Db } from "@/server/db/client";
import { createOrder } from "@/server/payments/orders";
import { signPayload } from "@/server/payments/sandbox";
import { getActiveEnrollment } from "@/server/enrollment/service";
import { createCourse, createTestDb, createUser } from "./support/fixtures";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  setDbForTesting(db);
});
afterAll(async () => {
  setDbForTesting(undefined);
  vi.unstubAllEnvs();
  await close();
});
const request = (body: string, signature?: string) =>
  new Request("http://localhost/api/payments/webhooks/sandbox", {
    method: "POST",
    body,
    headers: signature ? { "x-kuvona-signature": signature } : {},
  });

describe("sandbox HTTP adapter", () => {
  it("requires a signature and bounds request size", async () => {
    expect((await POST(request("{}"))).status).toBe(401);
    expect((await POST(request("x".repeat(16_385)))).status).toBe(413);
    expect((await POST(request("{bad", signPayload("{bad")))).status).toBe(400);
  });

  it("uses the exact raw body for verification and grants once on replay", async () => {
    const owner = await createUser(db, "instructor");
    const student = await createUser(db);
    const { course } = await createCourse(db, owner.id);
    const { order } = await createOrder(db, {
      userId: student.id,
      courseId: course.id,
      provider: "sandbox",
    });
    const raw = JSON.stringify(
      {
        eventId: `http-${order.id}`,
        reference: order.reference,
        outcome: "success",
        transactionId: "HTTP000001",
        amountCents: order.amountCents,
        currency: order.currency,
      },
      null,
      2,
    );
    const signature = signPayload(raw);
    expect(
      (await POST(request(raw.replace(/\n/g, ""), signature))).status,
    ).toBe(401);
    const paid = await POST(request(raw, signature));
    expect(paid.status).toBe(200);
    expect((await paid.json()).result).toBe("paid");
    expect((await (await POST(request(raw, signature))).json()).result).toBe(
      "duplicate",
    );
    expect(await getActiveEnrollment(db, student.id, course.id)).not.toBeNull();
  });

  it("is unavailable in production unless explicitly enabled", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://unreachable-test-value");
    vi.stubEnv("KUVONA_ENABLE_SANDBOX", "");
    try {
      expect((await POST(request("{}"))).status).toBe(404);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
