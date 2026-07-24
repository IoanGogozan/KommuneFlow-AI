import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const demoSessionSchema = z
  .object({
    tenantSlug: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .strict();

export type DemoSessionInput = z.infer<typeof demoSessionSchema>;
