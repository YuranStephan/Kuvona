/** Local mode = embedded PGlite database on this machine. Never used for real customers. */
export const isLocalMode = () => !process.env.DATABASE_URL;

/**
 * The payment simulator can grant access without money, so it is off everywhere unless a developer
 * opts in explicitly (tests and local E2E set KUVONA_ENABLE_SANDBOX=1). Never set it on the live site.
 */
export const sandboxEnabled = () => process.env.KUVONA_ENABLE_SANDBOX === "1";

export function webhookSecret() {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (secret) return secret;
  if (isLocalMode()) return "kuvona-local-sandbox-secret";
  throw new Error("PAYMENT_WEBHOOK_SECRET em falta.");
}
