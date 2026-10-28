import { createHash, randomBytes } from "node:crypto";

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** Short human-friendly code without ambiguous characters (no I, L, O, U). */
export function humanCode(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += CROCKFORD[b % 32];
  return out;
}
