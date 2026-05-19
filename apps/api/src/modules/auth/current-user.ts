import { UserRole } from '@prisma/client';
import { z } from 'zod';

export type CurrentUser = {
  id: string;
  tenantId: string;
  departmentId: string | null;
  email: string;
  role: UserRole;
};

const currentUserSchema = z
  .object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    departmentId: z.string().min(1).nullable(),
    email: z.string().min(1),
    role: z.nativeEnum(UserRole),
  })
  .passthrough();

export function parseCurrentUserPayload(payload: unknown): CurrentUser | null {
  const result = currentUserSchema.safeParse(payload);

  if (!result.success) {
    return null;
  }

  return {
    id: result.data.id,
    tenantId: result.data.tenantId,
    departmentId: result.data.departmentId,
    email: result.data.email,
    role: result.data.role,
  };
}
