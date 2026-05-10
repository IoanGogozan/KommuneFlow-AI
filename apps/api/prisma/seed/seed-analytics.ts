import { PrismaClient } from '@prisma/client';
import { cases } from './data/cases';
import { departments } from './data/departments';
import { tenants } from './data/tenants';
import { average, countBy, median } from './math';
import { DemoCase, SeedContext } from './types';

export async function seedAnalytics(prisma: PrismaClient, context: SeedContext) {
  for (const tenantSpec of tenants) {
    const tenantCases = cases.filter((item) => item.tenantSlug === tenantSpec.slug);
    const metrics = aiMetrics(tenantCases);
    const durations = durationMetrics(tenantCases);
    const tenant = context.tenantMap.get(tenantSpec.slug)!;

    await seedDailySnapshot(prisma, context, tenant.id, tenantSpec, tenantCases, {
      ...metrics,
      ...durations,
    });
    await seedDepartmentAnalytics(prisma, context, tenant.id, tenantSpec, tenantCases);
    await seedAiQuality(prisma, context, tenant.id, metrics);
    await seedMunicipalityAnalytics(prisma, context, tenant.id, tenantSpec, tenantCases);
  }
}

async function seedDailySnapshot(
  prisma: PrismaClient,
  context: SeedContext,
  tenantId: string,
  tenantSpec: (typeof tenants)[number],
  tenantCases: DemoCase[],
  metrics: ReturnType<typeof aiMetrics> & ReturnType<typeof durationMetrics>,
) {
  const data = {
    tenantId,
    totalCases: tenantCases.length,
    casesByStatusJson: countBy(tenantCases, (item) => item.status),
    casesByCategoryJson: countBy(tenantCases, (item) => item.category),
    casesByDepartmentJson: countBy(tenantCases, (item) => item.departmentSlug),
    aiReviewsTotal: metrics.reviewsTotal,
    aiCorrectionsTotal: metrics.corrected,
    aiCorrectionRate: metrics.reviewsTotal ? metrics.corrected / metrics.reviewsTotal : 0,
    averageTimeToTriageMinutes: average(metrics.triageDurations),
    medianTimeToTriageMinutes: median(metrics.triageDurations),
    averageTimeToCloseHours: average(metrics.closeDurations),
    medianTimeToCloseHours: median(metrics.closeDurations),
    casesWaitingForCitizen: tenantCases.filter(
      (item) => item.status === 'waiting_for_citizen',
    ).length,
    aiTriageSuccessCount: metrics.successes,
    aiTriageFailureCount: metrics.failures,
    aiTriageFailureRate:
      metrics.successes + metrics.failures
        ? metrics.failures / (metrics.successes + metrics.failures)
        : 0,
    aiSuggestionsAccepted: metrics.accepted,
    aiSuggestionAcceptanceRate: metrics.reviewsTotal
      ? metrics.accepted / metrics.reviewsTotal
      : 0,
    estimatedManualMinutesSaved: metrics.accepted * 5 + metrics.corrected * 2,
    municipalityPopulation: tenantSpec.population,
    municipalityPopulationYear: context.snapshotDate.getUTCFullYear(),
    casesPer1000Inhabitants: (tenantCases.length / tenantSpec.population) * 1000,
    ssbDataStatus: 'available',
    ssbImportedAt: context.importedAt,
    analyticsRebuiltAt: context.analyticsRebuiltAt,
  };

  await prisma.analyticsDailySnapshot.upsert({
    where: { tenantId_date: { tenantId, date: context.snapshotDate } },
    update: data,
    create: { ...data, date: context.snapshotDate },
  });
}

async function seedDepartmentAnalytics(
  prisma: PrismaClient,
  context: SeedContext,
  tenantId: string,
  tenantSpec: (typeof tenants)[number],
  tenantCases: DemoCase[],
) {
  for (const department of departments) {
    const departmentCases = tenantCases.filter(
      (item) => item.departmentSlug === department.slug,
    );
    const data = {
      departmentId: context.departmentMap.get(
        `${tenantSpec.slug}:${department.slug}`,
      )!.id,
      departmentName: department.name,
      caseCount: departmentCases.length,
      averageTimeToTriageMinutes: average(triageDurations(departmentCases)),
      averageTimeToCloseHours: average(closeDurations(departmentCases)),
    };

    await prisma.analyticsDepartmentDaily.upsert({
      where: {
        tenantId_date_departmentName: {
          tenantId,
          date: context.snapshotDate,
          departmentName: department.name,
        },
      },
      update: data,
      create: { tenantId, date: context.snapshotDate, ...data },
    });
  }
}

async function seedAiQuality(
  prisma: PrismaClient,
  context: SeedContext,
  tenantId: string,
  metrics: ReturnType<typeof aiMetrics>,
) {
  const data = {
    aiReviewsTotal: metrics.reviewsTotal,
    aiSuggestionsAccepted: metrics.accepted,
    aiCorrectionsTotal: metrics.corrected,
    aiAcceptanceRate: metrics.reviewsTotal ? metrics.accepted / metrics.reviewsTotal : 0,
    aiCorrectionRate: metrics.reviewsTotal ? metrics.corrected / metrics.reviewsTotal : 0,
    aiTriageSuccessCount: metrics.successes,
    aiTriageFailureCount: metrics.failures,
    aiTriageFailureRate:
      metrics.successes + metrics.failures
        ? metrics.failures / (metrics.successes + metrics.failures)
        : 0,
  };

  await prisma.analyticsAiQualityDaily.upsert({
    where: { tenantId_date: { tenantId, date: context.snapshotDate } },
    update: data,
    create: { tenantId, date: context.snapshotDate, ...data },
  });
}

async function seedMunicipalityAnalytics(
  prisma: PrismaClient,
  context: SeedContext,
  tenantId: string,
  tenantSpec: (typeof tenants)[number],
  tenantCases: DemoCase[],
) {
  const data = {
    municipalityName: tenantSpec.municipalityName,
    caseCount: tenantCases.length,
    population: tenantSpec.population,
    populationYear: context.snapshotDate.getUTCFullYear(),
    casesPer1000Inhabitants: (tenantCases.length / tenantSpec.population) * 1000,
    ssbImportedAt: context.importedAt,
  };

  await prisma.analyticsMunicipalityDaily.upsert({
    where: {
      tenantId_date_municipalityCode: {
        tenantId,
        date: context.snapshotDate,
        municipalityCode: tenantSpec.municipalityCode,
      },
    },
    update: data,
    create: {
      tenantId,
      date: context.snapshotDate,
      municipalityCode: tenantSpec.municipalityCode,
      ...data,
    },
  });
}

function aiMetrics(tenantCases: DemoCase[]) {
  const reviews = tenantCases.filter((item) => item.aiReview);
  const successes = tenantCases.filter(
    (item) => item.triageAfterMinutes && !item.aiFailed,
  ).length;
  const failures = tenantCases.filter((item) => item.aiFailed).length;

  return {
    reviewsTotal: reviews.length,
    accepted: tenantCases.filter((item) => item.aiReview === 'accepted').length,
    corrected: tenantCases.filter((item) => item.aiReview === 'corrected').length,
    successes,
    failures,
  };
}

function durationMetrics(tenantCases: DemoCase[]) {
  return {
    triageDurations: triageDurations(tenantCases),
    closeDurations: closeDurations(tenantCases),
  };
}

function triageDurations(tenantCases: DemoCase[]) {
  return tenantCases
    .map((item) => item.triageAfterMinutes)
    .filter((value): value is number => typeof value === 'number');
}

function closeDurations(tenantCases: DemoCase[]) {
  return tenantCases
    .map((item) => item.closeAfterHours)
    .filter((value): value is number => typeof value === 'number');
}
