import {
  BadRequestException,
  Controller,
  Get,
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
import { citizenDataExportQuerySchema } from './privacy.schemas';

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
}
