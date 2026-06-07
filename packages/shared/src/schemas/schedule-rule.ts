import { z } from "zod";
import { ErrorCode } from "../errors.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const baseRuleSchema = z.object({
  slotFrom: z.string().regex(timeRegex),
  slotTo: z.string().regex(timeRegex),
  appointmentDurationMin: z.number().int().min(5).max(480),
});

export const createScheduleRuleSchema = z
  .discriminatedUnion("type", [
    baseRuleSchema.extend({
      type: z.literal("recurring"),
      dayOfWeek: z.number().int().min(0).max(6),
    }),
    baseRuleSchema.extend({
      type: z.literal("one_time"),
      specificDate: z.iso.date(),
    }),
  ])
  .refine((data) => data.slotFrom < data.slotTo, {
    message: ErrorCode.SLOT_FROM_AFTER_SLOT_TO,
    path: ["slotFrom"],
  });

export const updateScheduleRuleSchema = z
  .object({
    slotFrom: z.string().regex(timeRegex).optional(),
    slotTo: z.string().regex(timeRegex).optional(),
    appointmentDurationMin: z.number().int().min(5).max(480).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.slotFrom && data.slotTo) return data.slotFrom < data.slotTo;
      return true;
    },
    { message: ErrorCode.SLOT_FROM_AFTER_SLOT_TO, path: ["slotFrom"] }
  );

export const scheduleRulesQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) return data.from <= data.to;
      return true;
    },
    { message: ErrorCode.DATE_RANGE_INVALID, path: ["from"] }
  )
  .refine(
    (data) => (data.from === undefined) === (data.to === undefined),
    { message: ErrorCode.DATE_RANGE_PARTIAL, path: ["from"] }
  );

export type CreateScheduleRuleInput = z.infer<typeof createScheduleRuleSchema>;
export type UpdateScheduleRuleInput = z.infer<typeof updateScheduleRuleSchema>;
export type ScheduleRulesQuery = z.infer<typeof scheduleRulesQuerySchema>;
