import { PrismaClient } from '@prisma/client';
import { createSeedContext } from './seed-context';
import { seedAnalytics } from './seed-analytics';
import { tenants } from './data/tenants';
import { SeedContext } from './types';

const DEMO_ANALYTICS_TENANT_SLUGS = tenants.map((tenant) => tenant.slug);

export type DemoAnalyticsBaselineResult = {
  analyticsSnapshotsDeleted: number;
  analyticsSnapshotsRestored: number;
  analyticsBaselineCases: number;
};

export async function rebuildDemoAnalytics(
  prisma: PrismaClient,
  context: SeedContext,
): Promise<DemoAnalyticsBaselineResult> {
  const analyticsSnapshotsDeleted = await deleteDemoAnalytics(prisma, context);
  const seedResult = await seedAnalytics(prisma, context);

  return {
    analyticsSnapshotsDeleted,
    analyticsSnapshotsRestored: seedResult.analyticsRowsCreated,
    analyticsBaselineCases: seedResult.baselineCases,
  };
}

export async function deleteDemoAnalytics(
  prisma: PrismaClient,
  context: SeedContext,
) {
  const tenantIds = getDemoTenantIds(context);

  if (tenantIds.length === 0) {
    return 0;
  }

  const result = await prisma.$transaction([
    prisma.analyticsDailySnapshot.deleteMany({
      where: { tenantId: { in: tenantIds } },
    }),
    prisma.analyticsDepartmentDaily.deleteMany({
      where: { tenantId: { in: tenantIds } },
    }),
    prisma.analyticsAiQualityDaily.deleteMany({
      where: { tenantId: { in: tenantIds } },
    }),
    prisma.analyticsMunicipalityDaily.deleteMany({
      where: { tenantId: { in: tenantIds } },
    }),
  ]);

  return result.reduce((sum, item) => sum + item.count, 0);
}

export function createDemoSeedContext(now: Date) {
  return createSeedContext(now);
}

function getDemoTenantIds(context: SeedContext) {
  return DEMO_ANALYTICS_TENANT_SLUGS.map((slug) => context.tenantMap.get(slug)?.id).filter(
    (tenantId): tenantId is string => Boolean(tenantId),
  );
}
