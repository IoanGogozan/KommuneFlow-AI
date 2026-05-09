import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AIService } from './ai.service';
import { reviewAITriageSchema } from './ai.schemas';

@Controller('cases/:caseId/ai-triage')
@UseGuards(AuthGuard, PermissionsGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('latest')
  async findLatestForCase(
    @Param('caseId') caseId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.aiService.findLatestForCase(caseId, user);
  }

  @Post()
  @RequirePermissions('ai:triage:run')
  async runCaseTriage(
    @Param('caseId') caseId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.aiService.runCaseTriage(caseId, user);
  }

  @Post(':resultId/review')
  @RequirePermissions('ai:triage:review')
  async reviewCaseTriage(
    @Param('caseId') caseId: string,
    @Param('resultId') resultId: string,
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.aiService.reviewCaseTriage(
        caseId,
        resultId,
        user,
        reviewAITriageSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid AI review payload.');
      }

      throw error;
    }
  }
}
