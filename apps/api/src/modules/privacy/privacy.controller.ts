import {
  BadRequestException,
  Controller,
  Body,
  Get,
  Patch,
  Param,
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
import { PrivacyService } from './privacy.service';
import {
  citizenDataExportQuerySchema,
  retentionCleanupSchema,
  updateRetentionPolicySchema,
} from './privacy.schemas';

@Controller('privacy')
@UseGuards(AuthGuard, PermissionsGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('status')
  @RequirePermissions('audit:read')
  status() {
    return this.privacyService.getStatus();
  }

  @Get('citizen-data-export')
  @RequirePermissions('privacy:export')
  async exportCitizenData(
    @CurrentUserParam() user: CurrentUser,
    @Query() query: unknown,
  ) {
    try {
      return await this.privacyService.exportCitizenData(
        user,
        citizenDataExportQuerySchema.parse(query),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid citizen data export query.');
      }

      throw error;
    }
  }

  @Post('citizen-profiles/:citizenProfileId/anonymize')
  @RequirePermissions('privacy:anonymize')
  anonymizeCitizenProfile(
    @CurrentUserParam() user: CurrentUser,
    @Param('citizenProfileId') citizenProfileId: string,
  ) {
    return this.privacyService.anonymizeCitizenProfile(user, citizenProfileId);
  }

  @Get('retention-policy')
  @RequirePermissions('privacy:export')
  retentionPolicy(@CurrentUserParam() user: CurrentUser) {
    return this.privacyService.getRetentionPolicy(user);
  }

  @Patch('retention-policy')
  @RequirePermissions('privacy:anonymize')
  async updateRetentionPolicy(
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.privacyService.updateRetentionPolicy(
        user,
        updateRetentionPolicySchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid retention policy payload.');
      }

      throw error;
    }
  }

  @Post('retention-cleanup')
  @RequirePermissions('privacy:anonymize')
  async runRetentionCleanup(
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.privacyService.runRetentionCleanup(
        user,
        retentionCleanupSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid retention cleanup payload.');
      }

      throw error;
    }
  }
}
