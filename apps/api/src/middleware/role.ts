import type { Context, Next } from "hono";
import { apiError } from "../lib/response.js";
import { ErrorCode } from "shared";
import type { AppVariables } from "../lib/types.js";

export function requireRole(role: AppVariables["role"]) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    if (c.get("role") !== role) {
      return apiError(c, ErrorCode.FORBIDDEN, 403);
    }
    await next();
  };
}
