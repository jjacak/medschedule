import { z } from "zod";

export const createAlertSchema = z.object({
  message: z.string().optional(),
  alertDate: z.iso.date().optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
