import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { validationError } from "../lib/response.js";
import {
  createScheduleRuleSchema,
  updateScheduleRuleSchema,
  scheduleRulesQuerySchema,
} from "shared";
import {
  createRule,
  getRulesForClinic,
  getMyRules,
  updateRule,
  deleteRule,
} from "../services/schedule.service.js";
import type { AppVariables } from "../lib/types.js";

export const scheduleRuleRoutes = new Hono<{ Variables: AppVariables }>();

scheduleRuleRoutes.post(
  "/clinics/:id/schedule-rules",
  authMiddleware,
  requireRole("doctor"),
  async (c) => {
    const result = createScheduleRuleSchema.safeParse(await c.req.json());
    if (!result.success) return validationError(c, result.error.issues);

    const rule = await createRule(c.get("userId"), c.req.param("id")!, result.data);
    return c.json(rule, 201);
  }
);

scheduleRuleRoutes.get("/clinics/:id/schedule-rules", authMiddleware, async (c) => {
  const queryResult = scheduleRulesQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) return validationError(c, queryResult.error.issues);

  const rules = await getRulesForClinic(c.req.param("id")!, queryResult.data);
  return c.json(rules);
});

scheduleRuleRoutes.get("/schedule-rules/my", authMiddleware, requireRole("doctor"), async (c) => {
  const queryResult = scheduleRulesQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) return validationError(c, queryResult.error.issues);

  const rules = await getMyRules(c.get("userId"), queryResult.data);
  return c.json(rules);
});

scheduleRuleRoutes.patch(
  "/schedule-rules/:id",
  authMiddleware,
  requireRole("doctor"),
  async (c) => {
    const result = updateScheduleRuleSchema.safeParse(await c.req.json());
    if (!result.success) return validationError(c, result.error.issues);

    const rule = await updateRule(c.req.param("id")!, c.get("userId"), result.data);
    return c.json(rule);
  }
);

scheduleRuleRoutes.delete(
  "/schedule-rules/:id",
  authMiddleware,
  requireRole("doctor"),
  async (c) => {
    await deleteRule(c.req.param("id")!, c.get("userId"));
    return new Response(null, { status: 204 });
  }
);
