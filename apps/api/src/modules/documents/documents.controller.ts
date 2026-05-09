import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { DocumentsService } from './documents.service';
import { uploadDocumentBodySchema } from './documents.schemas';

@Controller('cases/:caseId/documents')
@UseGuards(AuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async listForCase(
    @Param('caseId') caseId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.documentsService.listForCase(caseId, user);
  }

  @Post()
  @RequirePermissions('document:upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadForCase(
    @Param('caseId') caseId: string,
    @CurrentUserParam() user: CurrentUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    try {
      return await this.documentsService.uploadForCase(
        caseId,
        user,
        file,
        uploadDocumentBodySchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid document upload payload.');
      }

      throw error;
    }
  }
}
