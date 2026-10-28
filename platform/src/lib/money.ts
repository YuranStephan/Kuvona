// Money is always an integer number of centavos. Never use floats for amounts.

const symbols: Record<string, string> = { MZN: "MT" };

function group(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatMoney(cents: number, currency = "MZN") {
  if (!Number.isInteger(cents)) throw new TypeError("O montante tem de ser um número inteiro de centavos.");
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100);
  const rest = abs % 100;
  const amount = rest ? `${group(units)},${String(rest).padStart(2, "0")}` : group(units);
  return `${sign}${amount} ${symbols[currency] ?? currency}`;
}

export function formatPrice(cents: number, currency = "MZN") {
  return cents === 0 ? "Gratuito" : formatMoney(cents, currency);
}

/** Parses "1500", "1 500", "1.500,50" or "1500.5" into centavos. Returns null when invalid. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[\s  ]|MT|MZN/gi, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = "0", fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
