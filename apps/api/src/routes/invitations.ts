import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { acceptInvitation } from "../services/invitation.service.js";
import type { AppVariables } from "../lib/types.js";

export const invitationRoutes = new Hono<{ Variables: AppVariables }>();

invitationRoutes.post("/:token/accept", authMiddleware, async (c) => {
  await acceptInvitation(c.req.param("token")!, c.get("userId"));
  return new Response(null, { status: 204 });
});
