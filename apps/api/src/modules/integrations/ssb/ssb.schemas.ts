import { z } from 'zod';

export const importMunicipalityPopulationSchema = z.object({
  year: z.number().int().min(1986).max(2100),
  municipalityCodes: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\d{4}$/),
    )
    .min(1)
    .max(50),
});

export type ImportMunicipalityPopulationInput = z.infer<
  typeof importMunicipalityPopulationSchema
>;
