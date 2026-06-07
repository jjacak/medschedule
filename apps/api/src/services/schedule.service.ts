import { and, between, eq, isNull, or } from "drizzle-orm";
import { db } from "../lib/db.js";
import { AppError } from "../lib/app-error.js";
import { clinics, scheduleRules } from "db";
import { ErrorCode } from "shared";
import type {
  CreateScheduleRuleInput,
  UpdateScheduleRuleInput,
  ScheduleRulesQuery,
} from "shared";

async function assertRuleOwner(ruleId: string, doctorId: string) {
  const [rule] = await db
    .select({ id: scheduleRules.id, doctorId: scheduleRules.doctorId })
    .from(scheduleRules)
    .where(eq(scheduleRules.id, ruleId))
    .limit(1);

  if (!rule) throw new AppError(ErrorCode.SCHEDULE_RULE_NOT_FOUND, 404);
  if (rule.doctorId !== doctorId) throw new AppError(ErrorCode.FORBIDDEN, 403);
}

export async function createRule(
  doctorId: string,
  clinicId: string,
  data: CreateScheduleRuleInput
) {
  const [clinic] = await db
    .select({ ownerId: clinics.ownerId })
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
    .limit(1);

  if (!clinic) throw new AppError(ErrorCode.CLINIC_NOT_FOUND, 404);
  if (clinic.ownerId !== doctorId) throw new AppError(ErrorCode.FORBIDDEN, 403);

  const values =
    data.type === "recurring"
      ? { doctorId, clinicId, type: data.type, dayOfWeek: data.dayOfWeek, slotFrom: data.slotFrom, slotTo: data.slotTo, appointmentDurationMin: data.appointmentDurationMin }
      : { doctorId, clinicId, type: data.type, specificDate: data.specificDate, slotFrom: data.slotFrom, slotTo: data.slotTo, appointmentDurationMin: data.appointmentDurationMin };

  const [rule] = await db.insert(scheduleRules).values(values).returning();
  return rule;
}

export async function getRulesForClinic(
  clinicId: string,
  query: ScheduleRulesQuery
) {
  const { from, to } = query;

  if (!from || !to) {
    return db
      .select()
      .from(scheduleRules)
      .where(
        and(eq(scheduleRules.clinicId, clinicId), eq(scheduleRules.isActive, true))
      );
  }

  return db
    .select()
    .from(scheduleRules)
    .where(
      and(
        eq(scheduleRules.clinicId, clinicId),
        eq(scheduleRules.isActive, true),
        or(
          eq(scheduleRules.type, "recurring"),
          between(scheduleRules.specificDate, from, to)
        )
      )
    );
}

export async function getMyRules(
  doctorId: string,
  query: ScheduleRulesQuery
) {
  const { from, to } = query;

  if (!from || !to) {
    return db
      .select()
      .from(scheduleRules)
      .where(
        and(eq(scheduleRules.doctorId, doctorId), eq(scheduleRules.isActive, true))
      );
  }

  return db
    .select()
    .from(scheduleRules)
    .where(
      and(
        eq(scheduleRules.doctorId, doctorId),
        eq(scheduleRules.isActive, true),
        or(
          eq(scheduleRules.type, "recurring"),
          between(scheduleRules.specificDate, from, to)
        )
      )
    );
}

export async function updateRule(
  ruleId: string,
  doctorId: string,
  data: UpdateScheduleRuleInput
) {
  await assertRuleOwner(ruleId, doctorId);

  const [updated] = await db
    .update(scheduleRules)
    .set(data)
    .where(eq(scheduleRules.id, ruleId))
    .returning();

  return updated;
}

export async function deleteRule(ruleId: string, doctorId: string) {
  await assertRuleOwner(ruleId, doctorId);

  await db
    .update(scheduleRules)
    .set({ isActive: false })
    .where(eq(scheduleRules.id, ruleId));
}
