import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserParam } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/current-user';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { DocumentsService } from './documents.service';
import { uploadDocumentBodySchema } from './documents.schemas';

const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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

  @Get(':documentId/download')
  @Header('Cache-Control', 'private, no-store')
  async downloadForCase(
    @Param('caseId') caseId: string,
    @Param('documentId') documentId: string,
    @CurrentUserParam() user: CurrentUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const download = await this.documentsService.getDownloadForCase(
      caseId,
      documentId,
      user,
    );

    response.setHeader('Content-Type', download.mimeType);
    response.setHeader('Content-Length', String(download.sizeBytes));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeHeaderFileName(download.fileName)}"`,
    );

    return new StreamableFile(download.stream);
  }

  @Post()
  @RequirePermissions('document:upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES,
        files: 1,
      },
    }),
  )
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

  @Delete(':documentId')
  @RequirePermissions('document:upload')
  async softDeleteForCase(
    @Param('caseId') caseId: string,
    @Param('documentId') documentId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.documentsService.softDeleteForCase(caseId, documentId, user);
  }
}

function sanitizeHeaderFileName(fileName: string) {
  return fileName.replace(/["\r\n\\]/g, '_');
}
