import { z } from 'zod';

export const listAuditEventsQuerySchema = z.object({
  action: z.string().trim().min(1).max(160).optional(),
  actor: z.string().trim().min(1).max(160).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>;
