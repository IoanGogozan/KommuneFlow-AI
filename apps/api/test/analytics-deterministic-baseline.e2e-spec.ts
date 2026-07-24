import { UserRole } from '@prisma/client';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { PrismaService } from '../src/database/prisma.service';
import { runDemoReset } from '../prisma/demo-reset';
import { daysAgo, startOfUtcDay } from '../prisma/seed/time';
import { CurrentUser } from '../src/modules/auth/current-user';

describe('analytics deterministic baseline', () => {
  jest.setTimeout(120000);

  const prisma = new PrismaService();
  const analyticsService = new AnalyticsService(
    prisma,
    {
      getLatestPopulationForMunicipalities: jest.fn().mockResolvedValue([]),
    } as never,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as never,
  );

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('restores the same Kristiansand baseline across repeated resets', async () => {
    const env = createDemoResetEnv();
    const nowA = new Date('2026-07-24T12:00:00.000Z');
    const nowB = new Date('2026-07-25T12:00:00.000Z');
    const tenantId = await seedAndCleanDemoTenant(prisma, env, nowA);

    const baselineA = await resetAndSummarize(
      prisma,
      analyticsService,
      env,
      nowA,
      tenantId,
    );
    const baselineB = await resetAndSummarize(
      prisma,
      analyticsService,
      env,
      nowB,
      tenantId,
    );
    const baselineC = await resetAndSummarize(
      prisma,
      analyticsService,
      env,
      nowB,
      tenantId,
    );
    const baselineD = await resetAndSummarize(
      prisma,
      analyticsService,
      env,
      nowB,
      tenantId,
    );

    expect(baselineA).toEqual(expectedKristiansandBaseline);
    expect(baselineB).toEqual(expectedKristiansandBaseline);
    expect(baselineC).toEqual(expectedKristiansandBaseline);
    expect(baselineD).toEqual(expectedKristiansandBaseline);
  });
});

const expectedKristiansandBaseline = {
  totalCases: 9,
  aiReviewsTotal: 6,
  aiSuggestionsAccepted: 4,
  aiCorrectionsTotal: 2,
  aiTriageFailureCount: 1,
  aiTriageSuccessCount: 7,
  aiTriageRuns: 8,
  casesWaitingForCitizen: 1,
  estimatedManualMinutesSaved: 24,
};

async function resetAndSummarize(
  prisma: PrismaService,
  analyticsService: AnalyticsService,
  env: NodeJS.ProcessEnv,
  now: Date,
  tenantId: string,
) {
  await runDemoReset(prisma, {
    env,
    now,
    removeFile: () => Promise.resolve(undefined),
  });
  const summary = await analyticsService.getSummary(
    kristiansandUser(tenantId),
    {
      from: startOfUtcDay(daysAgo(now, 7)),
      to: startOfUtcDay(now),
    },
  );

  return {
    totalCases: summary.totals.totalCases,
    aiReviewsTotal: summary.totals.aiReviewsTotal,
    aiSuggestionsAccepted: summary.totals.aiSuggestionsAccepted,
    aiCorrectionsTotal: summary.totals.aiCorrectionsTotal,
    aiTriageFailureCount: summary.totals.aiTriageFailureCount,
    aiTriageSuccessCount: summary.totals.aiTriageSuccessCount,
    aiTriageRuns: summary.sampleSizes.aiTriageRuns,
    casesWaitingForCitizen: summary.totals.casesWaitingForCitizen,
    estimatedManualMinutesSaved: summary.totals.estimatedManualMinutesSaved,
  };
}

async function seedAndCleanDemoTenant(
  prisma: PrismaService,
  env: NodeJS.ProcessEnv,
  now: Date,
) {
  await runDemoReset(prisma, {
    env,
    now,
    removeFile: () => Promise.resolve(undefined),
  });

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: 'kristiansand' },
    select: { id: true },
  });

  await prisma.case.deleteMany({
    where: {
      tenantId: tenant.id,
      NOT: { id: { startsWith: 'seed_' } },
    },
  });

  await runDemoReset(prisma, {
    env,
    now,
    removeFile: () => Promise.resolve(undefined),
  });

  return tenant.id;
}

function createDemoResetEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the baseline reset test.');
  }

  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.replace(/^\/+/, ''),
  );

  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORTFOLIO_DEMO_ENABLED: 'true',
    PORTFOLIO_DEMO_RESET_CONFIRM: 'true',
    PORTFOLIO_DEMO_RESET_DATABASE_NAME: databaseName,
    PORTFOLIO_DEMO_RESET_AFTER_HOURS: '6',
    UPLOAD_STORAGE_PATH: process.env.UPLOAD_STORAGE_PATH ?? './storage/uploads',
  };
}

function kristiansandUser(tenantId: string): CurrentUser {
  return {
    id: 'baseline-test-user',
    tenantId,
    departmentId: null,
    email: 'department.admin@kristiansand.local',
    role: UserRole.department_admin,
  };
}
