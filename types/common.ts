export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export type ServiceErrorKind =
  | "not-configured"
  | "not-found"
  | "validation"
  | "upstream"
  | "rate-limit"
  | "unauthorized"
  | "unknown";

export interface ServiceError {
  kind: ServiceErrorKind;
  message: string;
  /** Optional setup hint shown in empty states. */
  hint?: string;
}

export const err = (
  kind: ServiceErrorKind,
  message: string,
  hint?: string,
): ServiceResult<never> => ({ ok: false, error: { kind, message, hint } });

export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
