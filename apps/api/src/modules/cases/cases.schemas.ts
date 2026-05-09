import { z } from 'zod';

export const updateCaseStatusSchema = z.object({
  status: z.enum([
    'new',
    'triage_pending',
    'triaged',
    'in_progress',
    'waiting_for_citizen',
    'closed',
    'rejected',
  ]),
});

export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
