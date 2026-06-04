import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../lib/db.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { COOKIE_OPTIONS } from "../lib/consts.js";
import { apiError, validationError } from "../lib/response.js";
import { users } from "db";
import { registerSchema, loginSchema, ErrorCode } from "shared";
import type { AppVariables } from "../lib/types.js";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

authRoutes.post("/register", authLimiter, async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, result.error.issues);
  }

  const { email, name, password, role } = result.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return apiError(c, ErrorCode.EMAIL_TAKEN, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash, role })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

  const token = await signToken({ sub: user.id, role: user.role });
  setCookie(c, "token", token, COOKIE_OPTIONS);

  return c.json(user, 201);
});

authRoutes.post("/login", authLimiter, async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, result.error.issues);
  }

  const { email, password } = result.data;

  const DUMMY_HASH =
    "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const passwordMatch = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH
  );

  if (!user || !passwordMatch) {
    return apiError(c, ErrorCode.INVALID_CREDENTIALS, 401);
  }

  const token = await signToken({ sub: user.id, role: user.role });
  setCookie(c, "token", token, COOKIE_OPTIONS);

  const { passwordHash: _, ...safeUser } = user;
  return c.json(safeUser);
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, "token", { path: "/" });
  return new Response(null, { status: 204 });
});

authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return apiError(c, ErrorCode.USER_NOT_FOUND, 404);

  return c.json(user);
});
