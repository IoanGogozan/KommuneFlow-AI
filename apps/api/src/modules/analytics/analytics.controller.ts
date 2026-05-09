import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { analyticsRangeSchema } from './analytics.schemas';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('analytics:read')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(
    @CurrentUserParam() user: CurrentUser,
    @Query() query: unknown,
  ) {
    try {
      return await this.analyticsService.getSummary(
        user,
        analyticsRangeSchema.parse(query),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid analytics query.');
      }

      throw error;
    }
  }

  @Post('aggregate')
  async aggregate(
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.analyticsService.aggregateTenantRange(
        user,
        analyticsRangeSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid analytics aggregation payload.');
      }

      throw error;
    }
  }
}
