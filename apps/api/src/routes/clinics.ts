import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { validationError } from "../lib/response.js";
import { createClinicSchema, updateClinicSchema, inviteUserSchema } from "shared";
import {
  createClinic,
  getClinicsForUser,
  getClinicById,
  updateClinic,
  deleteClinic,
} from "../services/clinic.service.js";
import {
  inviteUser,
  getStaff,
  revokeAccess,
} from "../services/invitation.service.js";
import type { AppVariables } from "../lib/types.js";

export const clinicRoutes = new Hono<{ Variables: AppVariables }>();

clinicRoutes.post("/", authMiddleware, requireRole("doctor"), async (c) => {
  const result = createClinicSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const clinic = await createClinic(c.get("userId"), result.data);
  return c.json(clinic, 201);
});

clinicRoutes.get("/", authMiddleware, async (c) => {
  const clinics = await getClinicsForUser(c.get("userId"), c.get("role"));
  return c.json(clinics);
});

clinicRoutes.get("/:id", authMiddleware, async (c) => {
  const clinic = await getClinicById(c.req.param("id")!, c.get("userId"), c.get("role"));
  return c.json(clinic);
});

clinicRoutes.patch("/:id", authMiddleware, requireRole("doctor"), async (c) => {
  const result = updateClinicSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const clinic = await updateClinic(c.req.param("id")!, c.get("userId"), result.data);
  return c.json(clinic);
});

clinicRoutes.delete("/:id", authMiddleware, requireRole("doctor"), async (c) => {
  await deleteClinic(c.req.param("id")!, c.get("userId"));
  return new Response(null, { status: 204 });
});

clinicRoutes.post("/:id/invitations", authMiddleware, requireRole("doctor"), async (c) => {
  const result = inviteUserSchema.safeParse(await c.req.json());
  if (!result.success) return validationError(c, result.error.issues);

  const invitation = await inviteUser(c.req.param("id")!, c.get("userId"), result.data);
  return c.json(invitation, 201);
});

clinicRoutes.get("/:id/staff", authMiddleware, requireRole("doctor"), async (c) => {
  const staff = await getStaff(c.req.param("id")!, c.get("userId"));
  return c.json(staff);
});

clinicRoutes.delete("/:id/staff/:memberId", authMiddleware, requireRole("doctor"), async (c) => {
  await revokeAccess(c.req.param("id")!, c.req.param("memberId")!, c.get("userId"));
  return new Response(null, { status: 204 });
});
