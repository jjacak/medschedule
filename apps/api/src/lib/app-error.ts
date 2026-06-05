import type { ErrorCode } from "shared";

type Status = 400 | 401 | 403 | 404 | 409 | 500;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: Status
  ) {
    super(code);
    this.name = "AppError";
  }
}
