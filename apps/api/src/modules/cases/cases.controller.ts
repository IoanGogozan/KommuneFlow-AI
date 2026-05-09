import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CasesService } from './cases.service';
import { updateCaseStatusSchema } from './cases.schemas';

@Controller('cases')
@UseGuards(AuthGuard, PermissionsGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.casesService.findById(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('case:update:department')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.casesService.updateStatus(
        id,
        user,
        updateCaseStatusSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid case status payload.');
      }

      throw error;
    }
  }
}
