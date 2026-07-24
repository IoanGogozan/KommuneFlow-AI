import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const REQUIRED_ANY_PERMISSIONS_KEY = 'requiredAnyPermissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequireAnyPermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, [permissions]);
