export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NO_MASTER_RESUME"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EXTERNAL_API_ERROR"
  | "DB_ERROR"
  | "RATE_LIMITED"
  | "EXPIRED_JOB"
  | "DELETED_JOB"
  | "OPERATION_IN_PROGRESS"
  | "MISSING_IDEMPOTENCY_KEY"
  | "INVALID_IDEMPOTENCY_KEY"
  | "AI_EXECUTION_ERROR"
  | "AI_PROVIDER_ERROR"
  | "INTERNAL_ERROR"
  | "CIRCUIT_BREAKER_OPEN"
  | "UNKNOWN";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
