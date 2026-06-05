import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { ErrorCode } from "shared";
import { AppError } from "../../lib/app-error.js";

// Mock the db module before importing the service
vi.mock("../../lib/db.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from "../../lib/db.js";
import { registerUser, loginUser, getUserById } from "../../services/auth.service.js";

function mockQuery(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

const FAKE_USER = {
  id: "uuid-1",
  email: "test@example.com",
  name: "Test User",
  role: "doctor" as const,
  createdAt: new Date(),
  passwordHash: "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234",
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── registerUser ────────────────────────────────────────────────────────────

describe("registerUser", () => {
  it("creates a user and returns token when email is free", async () => {
    // first select (email check) → no existing user
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockQuery([]));

    // insert → return created user (without passwordHash)
    const safeUser = { id: FAKE_USER.id, email: FAKE_USER.email, name: FAKE_USER.name, role: FAKE_USER.role, createdAt: FAKE_USER.createdAt };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([safeUser]));

    const result = await registerUser({
      email: "test@example.com",
      name: "Test User",
      password: "password123",
      role: "doctor",
    });

    expect(result.user.email).toBe("test@example.com");
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
  });

  it("throws EMAIL_TAKEN when email already exists", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([{ id: "existing-id" }]));

    const error = await registerUser({ email: "taken@example.com", name: "X", password: "password123", role: "doctor" }).catch(e => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.EMAIL_TAKEN);
    expect(error.status).toBe(409);
  });
});

// ─── loginUser ───────────────────────────────────────────────────────────────

describe("loginUser", () => {
  it("returns user and token on valid credentials", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const userWithHash = { ...FAKE_USER, passwordHash: hash };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([userWithHash]));

    const result = await loginUser({ email: "test@example.com", password: "password123" });

    expect(result.user.email).toBe("test@example.com");
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(result.token).toBeDefined();
  });

  it("throws INVALID_CREDENTIALS when user does not exist", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([]));

    await expect(
      loginUser({ email: "ghost@example.com", password: "password123" })
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS, status: 401 });
  });

  it("throws INVALID_CREDENTIALS when password is wrong", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([{ ...FAKE_USER, passwordHash: hash }]));

    await expect(
      loginUser({ email: "test@example.com", password: "wrong-password" })
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS, status: 401 });
  });
});

// ─── getUserById ─────────────────────────────────────────────────────────────

describe("getUserById", () => {
  it("returns user when found", async () => {
    const safeUser = { id: FAKE_USER.id, email: FAKE_USER.email, name: FAKE_USER.name, role: FAKE_USER.role, createdAt: FAKE_USER.createdAt };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([safeUser]));

    const user = await getUserById("uuid-1");
    expect(user?.id).toBe("uuid-1");
  });

  it("returns null when user not found", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery([]));

    const user = await getUserById("non-existent");
    expect(user).toBeNull();
  });
});
