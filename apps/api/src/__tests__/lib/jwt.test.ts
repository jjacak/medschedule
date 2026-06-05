import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../../lib/jwt.js";

describe("signToken / verifyToken", () => {
  it("roundtrip: signed token can be verified", async () => {
    const token = await signToken({ sub: "user-123", role: "doctor" });
    const payload = await verifyToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.role).toBe("doctor");
  });

  it("works for receptionist role", async () => {
    const token = await signToken({ sub: "user-456", role: "receptionist" });
    const payload = await verifyToken(token);

    expect(payload.role).toBe("receptionist");
  });

  it("throws on tampered token", async () => {
    const token = await signToken({ sub: "user-123", role: "doctor" });
    const tampered = token.slice(0, -5) + "xxxxx";

    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it("throws on completely invalid token", async () => {
    await expect(verifyToken("not.a.jwt")).rejects.toThrow();
  });
});
