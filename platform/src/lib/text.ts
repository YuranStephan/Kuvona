export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-PT")} ${n === 1 ? one : many}`;
}

/** Splits a textarea into trimmed, non-empty lines. */
export function lines(input: string | null | undefined, max = 20) {
  return (input ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNextPath(input: unknown, fallback = "/aprender") {
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return fallback;
  return input;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "•••";
  return `${digits.slice(0, 2)}•••••${digits.slice(-3)}`;
}
