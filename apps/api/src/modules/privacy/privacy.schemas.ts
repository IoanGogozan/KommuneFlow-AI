import { z } from 'zod';

export const citizenDataExportQuerySchema = z
  .object({
    citizenProfileId: z.string().trim().min(1).optional(),
    email: z.string().trim().email().max(320).optional(),
  })
  .refine((input) => input.citizenProfileId || input.email, {
    message: 'Either citizenProfileId or email is required.',
  });

export type CitizenDataExportQuery = z.infer<
  typeof citizenDataExportQuerySchema
>;
