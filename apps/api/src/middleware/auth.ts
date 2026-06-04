import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken } from "../lib/jwt.js";
import { apiError } from "../lib/response.js";
import { ErrorCode } from "shared";
import type { AppVariables } from "../lib/types.js";

export async function authMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next
) {
  const cookie = getCookie(c, "token");
  const header = c.req.header("Authorization")?.replace("Bearer ", "");
  const token = cookie ?? header;

  if (!token) return apiError(c, ErrorCode.UNAUTHORIZED, 401);

  try {
    const payload = await verifyToken(token);
    c.set("userId", payload.sub);
    c.set("role", payload.role);
    await next();
  } catch {
    return apiError(c, ErrorCode.UNAUTHORIZED, 401);
  }
}
