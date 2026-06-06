import { z } from "zod";

export const createClinicSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  color: z.string().optional(),
});

export const updateClinicSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(2).optional(),
  color: z.string().optional(),
});

export const inviteUserSchema = z.object({
  email: z.email(),
  role: z.enum(["doctor", "receptionist"]),
});

export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
