import { Injectable } from '@nestjs/common';
import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaService } from '../../database/prisma.service';

type ReadinessCheck = {
  status: 'ok' | 'error';
};

type ReadinessChecks = {
  database: ReadinessCheck;
  uploadStorage: ReadinessCheck;
};

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadinessChecks(): Promise<ReadinessChecks> {
    const [database, uploadStorage] = await Promise.all([
      this.checkDatabase(),
      this.checkUploadStorage(),
    ]);

    return {
      database,
      uploadStorage,
    };
  }

  private async checkDatabase(): Promise<ReadinessCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkUploadStorage(): Promise<ReadinessCheck> {
    try {
      const uploadStoragePath = resolve(
        process.env.UPLOAD_STORAGE_PATH ?? './storage/uploads',
      );

      await mkdir(uploadStoragePath, { recursive: true });
      await access(uploadStoragePath, constants.R_OK | constants.W_OK);

      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }
}
