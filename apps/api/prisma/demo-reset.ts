import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { rm } from 'node:fs/promises';
import { isAbsolute, parse, relative, resolve } from 'node:path';
import { cases } from './seed/data/cases';
import { departments } from './seed/data/departments';
import { tenants } from './seed/data/tenants';
import { seedCases } from './seed/seed-cases';
import { hoursAgo, startOfUtcDay } from './seed/time';
import type { SeedContext, TenantSlug } from './seed/types';

config({ path: '../../.env' });

export type DemoResetResult = {
  deletedCases: number;
  deletedCitizenProfiles: number;
  deletedFiles: number;
  cutoff: Date;
  seedCasesRestored: number;
};

export async function runDemoReset(
  prisma: PrismaClient,
  options: {
    env?: NodeJS.ProcessEnv;
    now?: Date;
    removeFile?: (path: string) => Promise<void>;
    restoreSeeds?: (prisma: PrismaClient, now: Date) => Promise<number>;
  } = {},
): Promise<DemoResetResult> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  const safety = validateResetSafety(env);
  const cutoff = new Date(
    now.getTime() - safety.resetAfterHours * 60 * 60 * 1000,
  );
  const visitorCases = await prisma.case.findMany({
    where: {
      createdAt: { lt: cutoff },
      NOT: { id: { startsWith: 'seed_' } },
    },
    select: {
      id: true,
      citizenProfileId: true,
      documents: { select: { id: true, storageKey: true } },
    },
  });
  const caseIds = visitorCases.map((item) => item.id);
  const citizenProfileIds = [
    ...new Set(visitorCases.map((item) => item.citizenProfileId)),
  ];
  const documentIds = visitorCases.flatMap((item) =>
    item.documents.map((document) => document.id),
  );
  const seedCaseIds = cases.map((item) => item.id);
  const seedTriageResults = await prisma.aITriageResult.findMany({
    where: { caseId: { in: seedCaseIds } },
    select: { id: true },
  });
  const seedActivityEntityIds = [
    ...seedCaseIds,
    ...seedTriageResults.map((item) => item.id),
  ];

  const deleted = await prisma.$transaction(async (transaction) => {
    await transaction.aIObservabilityEvent.deleteMany({
      where: { caseId: { in: seedCaseIds } },
    });
    await transaction.auditEvent.deleteMany({
      where: { entityId: { in: seedActivityEntityIds } },
    });
    await transaction.emailLog.deleteMany({
      where: { caseId: { in: seedCaseIds } },
    });
    await transaction.internalNote.deleteMany({
      where: { caseId: { in: seedCaseIds } },
    });
    await transaction.aIReview.deleteMany({
      where: { caseId: { in: seedCaseIds } },
    });
    await transaction.aITriageResult.deleteMany({
      where: { caseId: { in: seedCaseIds } },
    });

    if (caseIds.length === 0) {
      return { cases: 0, citizens: 0 };
    }

    await transaction.aIObservabilityEvent.deleteMany({
      where: { caseId: { in: caseIds } },
    });
    await transaction.auditEvent.deleteMany({
      where: {
        OR: [
          { entityType: 'case', entityId: { in: caseIds } },
          { entityType: 'case_document', entityId: { in: documentIds } },
        ],
      },
    });
    await transaction.emailLog.deleteMany({
      where: { caseId: { in: caseIds } },
    });
    const deletedCases = await transaction.case.deleteMany({
      where: { id: { in: caseIds } },
    });
    const deletedCitizens = await transaction.citizenProfile.deleteMany({
      where: {
        id: { in: citizenProfileIds },
        cases: { none: {} },
      },
    });
    return {
      cases: deletedCases.count,
      citizens: deletedCitizens.count,
    };
  });

  let deletedFiles = 0;
  const removeFile =
    options.removeFile ?? ((path: string) => rm(path, { force: true }));
  for (const storageKey of visitorCases.flatMap((item) =>
    item.documents.map((document) => document.storageKey),
  )) {
    await removeFile(resolveStorageFile(safety.uploadRoot, storageKey));
    deletedFiles += 1;
  }

  const seedCasesRestored = await (options.restoreSeeds ?? restoreSeedCases)(
    prisma,
    now,
  );

  return {
    deletedCases: deleted.cases,
    deletedCitizenProfiles: deleted.citizens,
    deletedFiles,
    cutoff,
    seedCasesRestored,
  };
}

export function validateResetSafety(env: NodeJS.ProcessEnv) {
  if (env.PORTFOLIO_DEMO_ENABLED !== 'true') {
    throw new Error('Demo reset refused: PORTFOLIO_DEMO_ENABLED must be true.');
  }
  if (env.PORTFOLIO_DEMO_RESET_CONFIRM !== 'true') {
    throw new Error(
      'Demo reset refused: PORTFOLIO_DEMO_RESET_CONFIRM must be true.',
    );
  }

  const databaseUrl = env.DATABASE_URL;
  const expectedDatabase = env.PORTFOLIO_DEMO_RESET_DATABASE_NAME;
  if (!databaseUrl || !expectedDatabase) {
    throw new Error(
      'Demo reset refused: DATABASE_URL and PORTFOLIO_DEMO_RESET_DATABASE_NAME are required.',
    );
  }
  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.replace(/^\/+/, ''),
  );
  if (databaseName !== expectedDatabase) {
    throw new Error('Demo reset refused: database name does not match.');
  }

  const resetAfterHours = parsePositiveInteger(
    env.PORTFOLIO_DEMO_RESET_AFTER_HOURS,
    6,
  );
  const uploadRoot = resolve(env.UPLOAD_STORAGE_PATH ?? './storage/uploads');
  if (
    uploadRoot === resolve('.') ||
    uploadRoot === parse(uploadRoot).root ||
    !uploadRoot.toLowerCase().includes('upload')
  ) {
    throw new Error('Demo reset refused: unsafe upload storage path.');
  }

  return { resetAfterHours, uploadRoot };
}

function resolveStorageFile(uploadRoot: string, storageKey: string) {
  if (isAbsolute(storageKey)) {
    throw new Error('Demo reset refused an absolute document storage key.');
  }
  const target = resolve(uploadRoot, storageKey);
  const pathFromRoot = relative(uploadRoot, target);
  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..\\`) ||
    pathFromRoot.startsWith('../') ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error('Demo reset refused a document path outside upload root.');
  }
  return target;
}

async function restoreSeedCases(prisma: PrismaClient, now: Date) {
  const context: SeedContext = {
    snapshotDate: startOfUtcDay(now),
    importedAt: hoursAgo(2),
    analyticsRebuiltAt: hoursAgo(1),
    tenantMap: new Map(),
    departmentMap: new Map(),
    adminByTenant: new Map(),
  };

  for (const tenantSpec of tenants) {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: tenantSpec.slug },
      select: { id: true },
    });
    context.tenantMap.set(tenantSpec.slug, tenant);

    for (const departmentSpec of departments) {
      const department = await prisma.department.findUniqueOrThrow({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: departmentSpec.slug,
          },
        },
        select: { id: true },
      });
      context.departmentMap.set(
        `${tenantSpec.slug}:${departmentSpec.slug}`,
        department,
      );
    }

    const admin = await prisma.user.findFirstOrThrow({
      where: {
        tenantId: tenant.id,
        role: {
          in: [UserRole.super_admin, UserRole.department_admin],
        },
      },
      select: { id: true, email: true },
    });
    context.adminByTenant.set(tenantSpec.slug as TenantSlug, admin);
  }

  await seedCases(prisma, cases, context);
  return cases.length;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(
      'PORTFOLIO_DEMO_RESET_AFTER_HOURS must be a positive integer.',
    );
  }
  return parsed;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await runDemoReset(prisma);
    console.info('Portfolio demo reset completed.', result);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/demo-reset.ts')) {
  void main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Demo reset failed.',
    );
    process.exit(1);
  });
}
