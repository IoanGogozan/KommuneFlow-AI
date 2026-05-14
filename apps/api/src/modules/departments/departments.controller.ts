import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@UseGuards(AuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(@CurrentUserParam() user: CurrentUser) {
    return this.departmentsService.listForCurrentTenant(user);
  }
}

@Controller('admin/departments')
@UseGuards(AuthGuard)
export class AdminDepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(@CurrentUserParam() user: CurrentUser) {
    if (!canManageDepartments(user)) {
      throw new ForbiddenException('Permission denied.');
    }

    return this.departmentsService.listAdminDepartments(user);
  }
}

function canManageDepartments(user: CurrentUser) {
  return (
    roleHasPermission(user.role, 'user:manage') ||
    roleHasPermission(user.role, 'routing_rules:manage') ||
    roleHasPermission(user.role, 'tenant:manage')
  );
}
