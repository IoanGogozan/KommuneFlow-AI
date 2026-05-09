import { UserRole } from '@prisma/client';

export type CurrentUser = {
  id: string;
  tenantId: string;
  departmentId: string | null;
  email: string;
  role: UserRole;
};
