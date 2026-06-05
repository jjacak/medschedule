import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { COOKIE_OPTIONS } from "../lib/consts.js";
import { validationError } from "../lib/response.js";
import { registerSchema, loginSchema } from "shared";
import { registerUser, loginUser, getUserById } from "../services/auth.service.js";
import type { AppVariables } from "../lib/types.js";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

authRoutes.post("/register", authLimiter, async (c) => {
  const result = registerSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const { user, token } = await registerUser(result.data);
  setCookie(c, "token", token, COOKIE_OPTIONS);
  return c.json(user, 201);
});

authRoutes.post("/login", authLimiter, async (c) => {
  const result = loginSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const { user, token } = await loginUser(result.data);
  setCookie(c, "token", token, COOKIE_OPTIONS);
  return c.json(user);
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, "token", { path: "/" });
  return new Response(null, { status: 204 });
});

authRoutes.get("/me", authMiddleware, async (c) => {
  const user = await getUserById(c.get("userId"));
  if (!user) return c.json({ error: "auth.user_not_found" }, 404);
  return c.json(user);
});
