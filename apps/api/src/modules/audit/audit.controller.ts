import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditService } from './audit.service';
import { listAuditEventsQuerySchema } from './audit.schemas';

@Controller('audit')
@UseGuards(AuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  @RequirePermissions('audit:read')
  async listEvents(
    @CurrentUserParam() user: CurrentUser,
    @Query() query: unknown,
  ) {
    try {
      return await this.auditService.listRecentEvents(
        user,
        listAuditEventsQuerySchema.parse(query),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid audit event query.');
      }

      throw error;
    }
  }
}
