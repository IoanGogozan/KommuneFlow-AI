import { z } from 'zod';

export const createPublicCaseSchema = z.object({
  citizen: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    address: z.string().trim().max(240).optional().or(z.literal('')),
  }),
  case: z.object({
    title: z.string().trim().min(5).max(180),
    description: z.string().trim().min(20).max(5000),
    sourceLanguage: z.enum(['nb', 'en']),
  }),
  privacyAccepted: z.literal(true),
});

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
export type CreatePublicCaseInput = z.infer<typeof createPublicCaseSchema>;
