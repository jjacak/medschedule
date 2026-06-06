import type { ErrorCode } from "shared";
import type { Status } from "./types.js";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: Status
  ) {
    super(code);
    this.name = "AppError";
  }
}
