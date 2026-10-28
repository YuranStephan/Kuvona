/** An expected business-rule failure whose message is safe to show to the user (Portuguese). */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string = "domain_error",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class AuthError extends DomainError {
  constructor(message = "Precisas de iniciar sessão.", code = "unauthenticated") {
    super(message, code);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Não tens permissão para esta ação.") {
    super(message, "forbidden");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Não encontrado.") {
    super(message, "not_found");
    this.name = "NotFoundError";
  }
}

/** Postgres unique_violation, optionally on a specific constraint/index. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const e = current as { code?: unknown; constraint?: unknown; constraint_name?: unknown; message?: unknown; cause?: unknown };
    if (e.code === "23505") {
      if (!constraint) return true;
      const name = e.constraint ?? e.constraint_name;
      if (name === constraint) return true;
      if (typeof e.message === "string" && e.message.includes(constraint)) return true;
    }
    current = e.cause;
  }
  return false;
}
