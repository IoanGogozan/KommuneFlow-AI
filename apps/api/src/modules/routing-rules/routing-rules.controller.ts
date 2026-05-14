import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { RoutingRulesService } from './routing-rules.service';

@Controller('admin/routing-rules')
@UseGuards(AuthGuard)
export class RoutingRulesController {
  constructor(private readonly routingRulesService: RoutingRulesService) {}

  @Get()
  async list(@CurrentUserParam() user: CurrentUser) {
    if (!roleHasPermission(user.role, 'routing_rules:manage')) {
      throw new ForbiddenException('Permission denied.');
    }

    return this.routingRulesService.listForTenant(user);
  }
}
