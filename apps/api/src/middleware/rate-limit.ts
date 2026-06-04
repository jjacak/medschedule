import { rateLimiter } from "hono-rate-limiter";

export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
});
