import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequireAnyPermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { publicCaseMultipartLimits } from '../../shared/upload/multipart-limits';
import {
  assertPublicUploadsAllowed,
  getPublicDemoSafetyConfig,
} from '../../config/public-demo-safety';
import { CasesService } from './cases.service';
import {
  createInternalNoteSchema,
  createPublicCaseSchema,
  listCasesQuerySchema,
  publicCaseStatusSchema,
  updateCaseStatusSchema,
} from './cases.schemas';

const MAX_PUBLIC_DOCUMENT_FILES = 5;
const publicDemoSafety = getPublicDemoSafetyConfig();

@Controller('public/tenants/:tenantSlug/cases')
export class PublicCasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @Throttle({
    default: {
      limit: publicDemoSafety.intakeLimit,
      ttl: publicDemoSafety.intakeTtlMs,
    },
  })
  @UseInterceptors(
    FilesInterceptor('documents', MAX_PUBLIC_DOCUMENT_FILES, {
      limits: publicCaseMultipartLimits,
    }),
  )
  async createPublicCase(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: unknown,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    try {
      assertPublicUploadsAllowed(files);
      return await this.casesService.createPublicCase(
        tenantSlug,
        createPublicCaseSchema.parse(parsePublicCaseBody(body)),
        files,
      );
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        throw new BadRequestException('Invalid case intake payload.');
      }

      throw error;
    }
  }

  @Post('status')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Throttle({
    default: {
      limit: publicDemoSafety.statusLimit,
      ttl: publicDemoSafety.statusTtlMs,
    },
  })
  async findPublicStatus(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: unknown,
  ) {
    try {
      return await this.casesService.findPublicStatus(
        tenantSlug,
        publicCaseStatusSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid case status lookup payload.');
      }

      throw error;
    }
  }
}

function parsePublicCaseBody(body: unknown) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'payload' in body &&
    typeof (body as { payload?: unknown }).payload === 'string'
  ) {
    return JSON.parse((body as { payload: string }).payload) as unknown;
  }

  return body;
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

  @Get(':id/activity')
  async listActivity(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.casesService.listActivity(id, user);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.casesService.findById(id, user);
  }

  @Patch(':id/status')
  @RequireAnyPermissions('case:update:department', 'case:update:all_tenant')
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
  @RequireAnyPermissions('case:update:department', 'case:update:all_tenant')
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
