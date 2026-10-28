/** Local mode = embedded PGlite database on this machine. Never used for real customers. */
export const isLocalMode = () => !process.env.DATABASE_URL;

/**
 * The payment simulator can grant access without money, so it only exists in local mode
 * or when a staging deployment opts in explicitly.
 */
export const sandboxEnabled = () => isLocalMode() || process.env.KUVONA_ENABLE_SANDBOX === "1";

export function webhookSecret() {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (secret) return secret;
  if (isLocalMode()) return "kuvona-local-sandbox-secret";
  throw new Error("PAYMENT_WEBHOOK_SECRET em falta.");
}
