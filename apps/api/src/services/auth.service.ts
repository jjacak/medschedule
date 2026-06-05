import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../lib/db.js";
import { signToken } from "../lib/jwt.js";
import { AppError } from "../lib/app-error.js";
import { users } from "db";
import { ErrorCode } from "shared";
import type { RegisterInput, LoginInput } from "shared";

const DUMMY_HASH =
  "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

const safeUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

export async function registerUser(data: RegisterInput) {
  const { email, name, password, role } = data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) throw new AppError(ErrorCode.EMAIL_TAKEN, 409);

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash, role })
    .returning(safeUserColumns);

  const token = await signToken({ sub: user.id, role: user.role });
  return { user, token };
}

export async function loginUser(data: LoginInput) {
  const { email, password } = data;

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
    throw new AppError(ErrorCode.INVALID_CREDENTIALS, 401);
  }

  const token = await signToken({ sub: user.id, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function getUserById(id: string) {
  const [user] = await db
    .select(safeUserColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}
