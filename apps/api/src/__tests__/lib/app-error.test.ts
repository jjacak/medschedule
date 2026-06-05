import { describe, it, expect } from "vitest";
import { AppError } from "../../lib/app-error.js";
import { ErrorCode } from "shared";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError(ErrorCode.UNAUTHORIZED, 401);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("sets code and status correctly", () => {
    const err = new AppError(ErrorCode.EMAIL_TAKEN, 409);
    expect(err.code).toBe(ErrorCode.EMAIL_TAKEN);
    expect(err.status).toBe(409);
  });

  it("has name AppError", () => {
    const err = new AppError(ErrorCode.UNAUTHORIZED, 401);
    expect(err.name).toBe("AppError");
  });

  it("message equals the error code", () => {
    const err = new AppError(ErrorCode.USER_NOT_FOUND, 404);
    expect(err.message).toBe(ErrorCode.USER_NOT_FOUND);
  });
});
