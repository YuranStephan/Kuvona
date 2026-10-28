import type { OrderStatus, PaymentProviderId } from "../db/schema";

/**
 * Order lifecycle.
 *
 *   pending ──student sends transaction ID──▶ awaiting_verification ──staff──▶ paid ──▶ refunded
 *      │  └──────────── gateway/staff confirm ──────────────────────────────▶ paid
 *      ├──▶ cancelled (student)   ├──▶ expired (time)   └──▶ failed (gateway/staff)
 *   awaiting_verification ──staff rejects──▶ failed
 *
 * awaiting_verification never expires on its own: the student says money was sent, so a person decides.
 */
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["awaiting_verification", "paid", "failed", "cancelled", "expired"],
  awaiting_verification: ["paid", "failed"],
  paid: ["refunded"],
  failed: [],
  cancelled: [],
  expired: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export const OPEN_STATUSES = ["pending", "awaiting_verification"] as const satisfies readonly OrderStatus[];
export const isOpen = (s: OrderStatus) => (OPEN_STATUSES as readonly OrderStatus[]).includes(s);

export const isManualProvider = (p: PaymentProviderId): p is "manual_mpesa" | "manual_emola" =>
  p === "manual_mpesa" || p === "manual_emola";

/** Sandbox orders imitate a USSD push that times out quickly. */
export const SANDBOX_TTL_MS = 15 * 60 * 1000;

/** Normalises a wallet transaction ID as printed in the confirmation SMS. */
export function normalizeTransactionId(input: string) {
  const value = input.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9][A-Z0-9.-]{5,29}$/.test(value) ? value : null;
}

/** Mozambican mobile number → 9 digits starting with 8, or null. Accepts +258 / 258 prefixes. */
export function normalizeMzPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("258")) digits = digits.slice(3);
  return /^8[2-7]\d{7}$/.test(digits) ? digits : null;
}
