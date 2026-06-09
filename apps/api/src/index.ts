import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";
import { authRoutes } from "./routes/auth.js";
import { clinicRoutes } from "./routes/clinics.js";
import { invitationRoutes } from "./routes/invitations.js";
import { scheduleRuleRoutes } from "./routes/schedule-rules.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { alertRoutes } from "./routes/alerts.js";
import { ErrorCode } from "shared";
import { AppError } from "./lib/app-error.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use("*", logger());

app.route("/auth", authRoutes);
app.route("/clinics", clinicRoutes);
app.route("/invitations", invitationRoutes);
app.route("/", scheduleRuleRoutes);
app.route("/", appointmentRoutes);
app.route("/", alertRoutes);

app.get("/health", (c) => c.json({ ok: true }));

app.onError((err, c) => {
  if (err instanceof AppError) return c.json({ error: err.code }, err.status);
  console.error(err);
  return c.json({ error: ErrorCode.INTERNAL_ERROR }, 500);
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`API running on http://localhost:${port}`);
