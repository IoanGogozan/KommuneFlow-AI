import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@CurrentUserParam() user: CurrentUser) {
    if (!roleHasPermission(user.role, 'user:manage')) {
      throw new ForbiddenException('Permission denied.');
    }

    return this.usersService.listAdminUsers(user);
  }
}
