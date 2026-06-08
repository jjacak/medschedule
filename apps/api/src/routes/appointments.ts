import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { validationError } from "../lib/response.js";
import { scheduleRulesQuerySchema, createAppointmentSchema, createCancellationRequestSchema } from "shared";
import {
  createAppointment,
  getAppointmentsForClinic,
  getMyAppointments,
  cancelAppointment,
  createCancellationRequest,
  getCancellationRequests,
  confirmCancellationRequest,
} from "../services/appointment.service.js";
import type { AppVariables } from "../lib/types.js";

export const appointmentRoutes = new Hono<{ Variables: AppVariables }>();

appointmentRoutes.post("/appointments", authMiddleware, async (c) => {
  const result = createAppointmentSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const appointment = await createAppointment(c.get("userId"), result.data);
  return c.json(appointment, 201);
});

appointmentRoutes.get("/clinics/:id/appointments", authMiddleware, async (c) => {
  const queryResult = scheduleRulesQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) return validationError(c, queryResult.error.issues);

  const { from, to } = queryResult.data;
  const appts = await getAppointmentsForClinic(c.req.param("id")!, from, to);
  return c.json(appts);
});

appointmentRoutes.get("/appointments/my", authMiddleware, requireRole("doctor"), async (c) => {
  const queryResult = scheduleRulesQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) return validationError(c, queryResult.error.issues);

  const { from, to } = queryResult.data;
  const appts = await getMyAppointments(c.get("userId"), from, to);
  return c.json(appts);
});

appointmentRoutes.delete("/appointments/:id", authMiddleware, async (c) => {
  await cancelAppointment(c.req.param("id")!, c.get("userId"));
  return new Response(null, { status: 204 });
});

appointmentRoutes.post(
  "/clinics/:id/cancellation-requests",
  authMiddleware,
  requireRole("doctor"),
  async (c) => {
    const result = createCancellationRequestSchema.safeParse(await c.req.json());
    if (!result.success) return validationError(c, result.error.issues);

    await createCancellationRequest(c.get("userId"), c.req.param("id")!, result.data);
    return new Response(null, { status: 201 });
  }
);

appointmentRoutes.get(
  "/clinics/:id/cancellation-requests",
  authMiddleware,
  async (c) => {
    const requests = await getCancellationRequests(c.req.param("id")!);
    return c.json(requests);
  }
);

appointmentRoutes.patch(
  "/cancellation-requests/:id/confirm",
  authMiddleware,
  requireRole("receptionist"),
  async (c) => {
    await confirmCancellationRequest(c.req.param("id")!, c.get("userId"));
    return new Response(null, { status: 204 });
  }
);
