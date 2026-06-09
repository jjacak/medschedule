import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { validationError } from "../lib/response.js";
import { addConnection, removeConnection } from "../lib/sse-store.js";
import { createAlertSchema } from "shared";
import { createAlert, getAlerts, deactivateAlert, assertClinicAccess } from "../services/alert.service.js";
import type { AppVariables } from "../lib/types.js";

export const alertRoutes = new Hono<{ Variables: AppVariables }>();

alertRoutes.get("/clinics/:id/alerts/stream", authMiddleware, async (c) => {
  const clinicId = c.req.param("id")!;

  await assertClinicAccess(clinicId, c.get("userId"), c.get("role"));

  return streamSSE(c, async (stream) => {
    addConnection(clinicId, stream);

    stream.onAbort(() => removeConnection(clinicId, stream));

    // keep-alive ping every 30s
    while (!stream.closed) {
      await stream.writeSSE({ event: "ping", data: "" });
      await stream.sleep(30000);
    }
  });
});

alertRoutes.post("/clinics/:id/alerts", authMiddleware, requireRole("doctor"), async (c) => {
  const result = createAlertSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const alert = await createAlert(c.get("userId"), c.req.param("id")!, result.data);
  return c.json(alert, 201);
});

alertRoutes.get("/clinics/:id/alerts", authMiddleware, async (c) => {
  const date = c.req.query("date");
  const alerts = await getAlerts(c.req.param("id")!, c.get("userId"), c.get("role"), date);
  return c.json(alerts);
});

alertRoutes.delete("/alerts/:id", authMiddleware, requireRole("doctor"), async (c) => {
  await deactivateAlert(c.req.param("id")!, c.get("userId"));
  return new Response(null, { status: 204 });
});
