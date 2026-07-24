import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OperationalEventService } from '../operations/operational-event.service';
import { safeRequestPath } from '../../shared/middleware/request-path';
import { AuthenticatedRequest } from './auth.guard';
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './permissions.decorator';
import { Permission, roleHasPermission } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredAnyPermissions =
      this.reflector.getAllAndOverride<Permission[][]>(
        REQUIRED_ANY_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (
      requiredPermissions.length === 0 &&
      requiredAnyPermissions.length === 0
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      void this.recordPermissionDenied(
        request,
        requiredPermissions,
        requiredAnyPermissions,
      );
      throw new ForbiddenException('Permission denied.');
    }

    const hasAllRequired = requiredPermissions.every((permission) =>
      roleHasPermission(user.role, permission),
    );
    const hasEveryAnyGroup = requiredAnyPermissions.every((group) =>
      group.some((permission) => roleHasPermission(user.role, permission)),
    );

    if (!hasAllRequired || !hasEveryAnyGroup) {
      void this.recordPermissionDenied(
        request,
        requiredPermissions,
        requiredAnyPermissions,
      );
      throw new ForbiddenException('Permission denied.');
    }

    return true;
  }

  private async recordPermissionDenied(
    request: AuthenticatedRequest,
    requiredPermissions: Permission[],
    requiredAnyPermissions: Permission[][],
  ) {
    await this.operationalEventService.record({
      eventType: 'security.permission_denied',
      severity: 'warning',
      source: 'permissions_guard',
      tenantId: request.user?.tenantId,
      userId: request.user?.id,
      requestId: request.requestId,
      safeMessage: 'Permission denied.',
      metadata: {
        method: request.method,
        path: safeRequestPath(request),
        requiredPermissions,
        requiredAnyPermissions,
        role: request.user?.role ?? null,
      },
    });
  }
}
