import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OperationalEventService } from '../operations/operational-event.service';
import { AuthenticatedRequest } from './auth.guard';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';
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

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      void this.recordPermissionDenied(request, requiredPermissions);
      throw new ForbiddenException('Permission denied.');
    }

    const allowed = requiredPermissions.every((permission) =>
      roleHasPermission(user.role, permission),
    );

    if (!allowed) {
      void this.recordPermissionDenied(request, requiredPermissions);
      throw new ForbiddenException('Permission denied.');
    }

    return true;
  }

  private async recordPermissionDenied(
    request: AuthenticatedRequest,
    requiredPermissions: Permission[],
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
        path: request.originalUrl ?? request.url,
        requiredPermissions,
        role: request.user?.role ?? null,
      },
    });
  }
}
