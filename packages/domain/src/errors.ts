/** Domain errors, never string exceptions (§83). */
export type DomainErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'INVARIANT_VIOLATED'
  | 'RATE_LIMITED'
  | 'NOT_AVAILABLE'
  | 'PROVIDER_ERROR';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
  /** i18n key so the surface can render this safely in Bangla (ADR 0002). */
  readonly messageKey?: string;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: { details?: Record<string, unknown>; messageKey?: string; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'DomainError';
    this.code = code;
    this.details = Object.freeze({ ...(options.details ?? {}) });
    this.messageKey = options.messageKey;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', `${resource} not found`, { details: id ? { resource, id } : { resource } });
    this.name = 'NotFoundError';
  }
}

export class InvariantViolatedError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INVARIANT_VIOLATED', message, { details: details ?? {} });
    this.name = 'InvariantViolatedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('FORBIDDEN', message, { details: details ?? {} });
    this.name = 'ForbiddenError';
  }
}
