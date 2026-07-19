import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { CurrentUser } from '../src/modules/auth/current-user';
import { PrivacyService } from '../src/modules/privacy/privacy.service';

describe('retention cleanup cascade protection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let privacyService: PrivacyService;
  let storageRoot: string;
  const tenantIds: string[] = [];

  beforeAll(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'kommuneflow-retention-e2e-'));
    process.env.UPLOAD_STORAGE_PATH = storageRoot;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    privacyService = app.get(PrivacyService);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('removes storage before a real Prisma case cascade and isolates tenants', async () => {
    const suffix = Date.now().toString(36);
    const fixture = await createTenantFixture(prisma, `cleanup-${suffix}`);
    const other = await createTenantFixture(prisma, `other-${suffix}`);
    tenantIds.push(fixture.tenantId, other.tenantId);
    const targetKey = `${fixture.tenantId}/${fixture.caseId}/target.pdf`;
    const otherKey = `${other.tenantId}/${other.caseId}/other.pdf`;
    const targetPath = join(storageRoot, targetKey);
    const otherPath = join(storageRoot, otherKey);
    await mkdir(dirname(targetPath), { recursive: true });
    await mkdir(dirname(otherPath), { recursive: true });
    await writeFile(targetPath, Buffer.from('%PDF target'));
    await writeFile(otherPath, Buffer.from('%PDF other'));
    await prisma.caseDocument.createMany({
      data: [
        documentRecord(fixture, targetKey, `target-${suffix}.pdf`),
        documentRecord(other, otherKey, `other-${suffix}.pdf`),
      ],
    });
    await prisma.retentionPolicy.create({
      data: { tenantId: fixture.tenantId, closedCaseRetentionDays: 1 },
    });

    const result = await privacyService.runRetentionCleanup(fixture.user, {
      confirm: true,
    });

    expect(result).toMatchObject({
      deleted: { closedCases: 1 },
      skipped: { closedCases: 0, documents: 0 },
      documentStorage: { filesDeleted: 1, cleanupFailures: 0 },
    });
    await expect(access(targetPath)).rejects.toThrow();
    await expect(access(otherPath)).resolves.toBeUndefined();
    await expect(
      prisma.case.findUnique({ where: { id: fixture.caseId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.caseDocument.findFirst({ where: { storageKey: targetKey } }),
    ).resolves.toBeNull();
    await expect(
      prisma.case.findUnique({ where: { id: other.caseId } }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.auditEvent.findFirst({
        where: {
          tenantId: fixture.tenantId,
          action: 'privacy.retention_cleanup_executed',
        },
      }),
    ).resolves.not.toBeNull();
  });
});

async function createTenantFixture(prisma: PrismaService, slug: string) {
  const tenant = await prisma.tenant.create({
    data: { name: `Synthetic ${slug}`, slug },
  });
  const citizen = await prisma.citizenProfile.create({
    data: {
      tenantId: tenant.id,
      name: 'Synthetic Citizen',
      email: `citizen-${slug}@example.test`,
    },
  });
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `admin-${slug}@example.test`,
      passwordHash: 'synthetic-not-a-real-password-hash',
      name: 'Synthetic Admin',
      role: UserRole.super_admin,
    },
  });
  const caseRecord = await prisma.case.create({
    data: {
      tenantId: tenant.id,
      citizenProfileId: citizen.id,
      caseReference: `KF-${slug}`,
      statusAccessCodeHash: 'synthetic-hash',
      title: 'Synthetic closed case',
      description: 'Synthetic retention verification only.',
      sourceLanguage: 'en',
      status: 'closed',
      closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    tenantId: tenant.id,
    caseId: caseRecord.id,
    user: {
      id: user.id,
      tenantId: tenant.id,
      departmentId: null,
      email: user.email,
      role: user.role,
    } satisfies CurrentUser,
  };
}

function documentRecord(
  fixture: { tenantId: string; caseId: string },
  storageKey: string,
  originalFileName: string,
) {
  return {
    tenantId: fixture.tenantId,
    caseId: fixture.caseId,
    originalFileName,
    storageKey,
    mimeType: 'application/pdf',
    sizeBytes: 11,
    checksumSha256: 'synthetic-checksum',
  };
}
