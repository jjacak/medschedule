import type { Context } from "hono";
import { ErrorCode } from "shared";
import type { Status } from "./types.js";

interface ParseIssue {
  code: string;
  path: PropertyKey[];
  format?: string;
  message?: string;
}

export function apiError(c: Context, code: ErrorCode, status: Status) {
  return c.json({ error: code }, status);
}

function issueToCode(issue: ParseIssue): ErrorCode {
  if (issue.code === "custom" && issue.message) {
    return issue.message as ErrorCode;
  }
  if (issue.code === "invalid_format" && issue.format === "email") {
    return ErrorCode.INVALID_EMAIL;
  }
  if (issue.code === "too_small") return ErrorCode.STRING_TOO_SMALL;
  return ErrorCode.INVALID_VALUE;
}

export function validationError(c: Context, issues: ParseIssue[]) {
  const fields = Object.fromEntries(
    issues.map((issue) => [issue.path.join("."), issueToCode(issue)])
  );
  return c.json({ error: ErrorCode.VALIDATION, fields }, 400);
}
