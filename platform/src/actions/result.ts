import { ZodError } from "zod";
import { DomainError } from "@/server/errors";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every result so client effects (e.g. clearing a form) can react to repeated successes. */
  at?: number;
};

export const initialState: ActionState = {};

/** Maps expected failures to a user-facing state; unexpected ones are logged and hidden. */
export function failure(error: unknown): ActionState {
  if (error instanceof DomainError) return { error: error.message, at: Date.now() };
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] ??= issue.message;
    }
    return { error: Object.values(fieldErrors)[0] ?? "Verifica os campos assinalados.", fieldErrors, at: Date.now() };
  }
  console.error("[action]", error);
  return { error: "Algo correu mal do nosso lado. Tenta novamente dentro de instantes.", at: Date.now() };
}

export const success = (message?: string): ActionState => ({ ok: true, message, at: Date.now() });

export function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export function bool(form: FormData, key: string) {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}
