export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EXTERNAL_API_ERROR"
  | "DB_ERROR"
  | "RATE_LIMITED"
  | "EXPIRED_JOB"
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
