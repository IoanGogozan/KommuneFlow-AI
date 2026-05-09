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

const retentionDaysSchema = z.coerce.number().int().min(1).max(36500);

export const updateRetentionPolicySchema = z.object({
  closedCaseRetentionDays: retentionDaysSchema.optional(),
  deletedDocumentRetentionDays: retentionDaysSchema.optional(),
  auditEventRetentionDays: retentionDaysSchema.optional(),
  analyticsRetentionDays: retentionDaysSchema.optional(),
});

export const retentionCleanupSchema = z.object({
  confirm: z.boolean().optional().default(false),
});

export type UpdateRetentionPolicyInput = z.infer<
  typeof updateRetentionPolicySchema
>;
export type RetentionCleanupInput = z.infer<typeof retentionCleanupSchema>;
