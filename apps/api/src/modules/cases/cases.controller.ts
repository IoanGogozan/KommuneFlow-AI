import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CasesService } from './cases.service';
import {
  createInternalNoteSchema,
  createPublicCaseSchema,
  listCasesQuerySchema,
  updateCaseStatusSchema,
} from './cases.schemas';

@Controller('public/tenants/:tenantSlug/cases')
export class PublicCasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createPublicCase(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: unknown,
  ) {
    try {
      return await this.casesService.createPublicCase(
        tenantSlug,
        createPublicCaseSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid case intake payload.');
      }

      throw error;
    }
  }
}

@Controller('cases')
@UseGuards(AuthGuard, PermissionsGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async list(@CurrentUserParam() user: CurrentUser, @Query() query: unknown) {
    try {
      return await this.casesService.list(
        user,
        listCasesQuerySchema.parse(query),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid case list query.');
      }

      throw error;
    }
  }

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

  @Post(':id/internal-notes')
  @RequirePermissions('case:update:department')
  async addInternalNote(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
    @Body() body: unknown,
  ) {
    try {
      return await this.casesService.addInternalNote(
        id,
        user,
        createInternalNoteSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid internal note payload.');
      }

      throw error;
    }
  }
}
