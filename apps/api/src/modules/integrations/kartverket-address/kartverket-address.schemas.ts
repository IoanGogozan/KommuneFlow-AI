import { z } from 'zod';

export const addressSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(120),
});

export type AddressSearchQuery = z.infer<typeof addressSearchQuerySchema>;
