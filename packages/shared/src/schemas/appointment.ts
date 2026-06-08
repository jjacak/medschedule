import { z } from "zod";

export const createAppointmentSchema = z.object({
  scheduleRuleId: z.uuid(),
  apptDate: z.iso.date(),
  apptTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  patientName: z.string().min(2),
  note: z.string().optional(),
});

export const createCancellationRequestSchema = z.object({
  targetDate: z.iso.date(),
  appointmentId: z.uuid().optional(),
  reason: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateCancellationRequestInput = z.infer<typeof createCancellationRequestSchema>;
