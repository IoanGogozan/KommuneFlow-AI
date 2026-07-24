import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { SsbService } from '../integrations/ssb/ssb.service';
import { OperationalEventService } from '../operations/operational-event.service';
import { AnalyticsRange } from './analytics.schemas';

type CountMap = Record<string, number>;
type SampleSizes = {
  aiReviews: number;
  aiTriageRuns: number;
  triageDurations: number;
  closeDurations: number;
};
const SSB_STALE_AFTER_DAYS = 395;
const DEFAULT_ACCEPTED_AI_MINUTES_SAVED = 5;
const DEFAULT_CORRECTED_AI_MINUTES_SAVED = 2;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ssbService: SsbService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  async aggregateTenantRange(user: CurrentUser, range: AnalyticsRange) {
    assertValidRange(range);
    const days = getDaysInclusive(range.from, range.to);

    for (const date of days) {
      await this.aggregateTenantDay(user.tenantId, date);
    }

    await this.operationalEventService.record({
      eventType: 'analytics.rebuild_completed',
      severity: 'info',
      source: 'analytics',
      tenantId: user.tenantId,
      userId: user.id,
      safeMessage: 'Analytics rebuild completed.',
      metadata: {
        from: toDateKey(range.from),
        to: toDateKey(range.to),
        daysAggregated: days.length,
      },
    });

    return {
      tenantId: user.tenantId,
      from: toDateKey(range.from),
      to: toDateKey(range.to),
      daysAggregated: days.length,
    };
  }

  async getSummary(user: CurrentUser, range: AnalyticsRange) {
    assertValidRange(range);
    const endExclusive = nextUtcDay(range.to);
    const [snapshots, cases, aiReviews, aiTriageResults] = await Promise.all([
      this.prisma.analyticsDailySnapshot.findMany({
        where: {
          tenantId: user.tenantId,
          date: {
            gte: range.from,
            lt: endExclusive,
          },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          totalCases: true,
          casesByStatusJson: true,
          casesByCategoryJson: true,
          casesByDepartmentJson: true,
          aiReviewsTotal: true,
          aiCorrectionsTotal: true,
          aiCorrectionRate: true,
          averageTimeToTriageMinutes: true,
          medianTimeToTriageMinutes: true,
          averageTimeToCloseHours: true,
          medianTimeToCloseHours: true,
          casesWaitingForCitizen: true,
          aiTriageSuccessCount: true,
          aiTriageFailureCount: true,
          aiTriageFailureRate: true,
          aiSuggestionsAccepted: true,
          aiSuggestionAcceptanceRate: true,
          estimatedManualMinutesSaved: true,
          municipalityPopulation: true,
          municipalityPopulationYear: true,
          casesPer1000Inhabitants: true,
          ssbDataStatus: true,
          ssbImportedAt: true,
          analyticsRebuiltAt: true,
        },
      }),
      this.prisma.case.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: {
            gte: range.from,
            lt: endExclusive,
          },
        },
        select: {
          createdAt: true,
          closedAt: true,
          status: true,
          category: true,
          assignedDepartment: {
            select: {
              slug: true,
            },
          },
          aiTriageResults: {
            orderBy: { createdAt: 'asc' },
            select: {
              createdAt: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.aIReview.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: {
            gte: range.from,
            lt: endExclusive,
          },
        },
        select: {
          wasAiSuggestionAccepted: true,
        },
      }),
      this.prisma.aITriageResult.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: {
            gte: range.from,
            lt: endExclusive,
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

    const casesByStatus = countBy(cases, (item) => item.status);
    const casesByCategory = countBy(cases, (item) => item.category);
    const casesByDepartment = countBy(
      cases,
      (item) => item.assignedDepartment?.slug ?? 'unassigned',
    );
    const aiReviewsTotal = aiReviews.length;
    const aiSuggestionsAccepted = aiReviews.filter(
      (review) => review.wasAiSuggestionAccepted,
    ).length;
    const aiCorrectionsTotal = aiReviewsTotal - aiSuggestionsAccepted;
    const aiTriageSuccessCount = aiTriageResults.filter((result) =>
      ['completed', 'reviewed'].includes(result.status),
    ).length;
    const aiTriageFailureCount = aiTriageResults.filter(
      (result) => result.status === 'failed',
    ).length;
    const triageDurations = getTimeToTriageMinutes(cases);
    const closeDurations = getTimeToCloseHours(cases);
    const sampleSizes: SampleSizes = {
      aiReviews: aiReviewsTotal,
      aiTriageRuns: aiTriageSuccessCount + aiTriageFailureCount,
      triageDurations: triageDurations.length,
      closeDurations: closeDurations.length,
    };
    const totals = {
      totalCases: cases.length,
      casesByStatus,
      casesByCategory,
      casesByDepartment,
      aiReviewsTotal,
      aiCorrectionsTotal,
      aiCorrectionRate:
        aiReviewsTotal === 0 ? 0 : aiCorrectionsTotal / aiReviewsTotal,
      averageTimeToTriageMinutes: average(triageDurations),
      medianTimeToTriageMinutes: median(triageDurations),
      averageTimeToCloseHours: average(closeDurations),
      medianTimeToCloseHours: median(closeDurations),
      casesWaitingForCitizen: cases.filter(
        (caseRecord) => caseRecord.status === 'waiting_for_citizen',
      ).length,
      aiTriageSuccessCount,
      aiTriageFailureCount,
      aiTriageFailureRate:
        sampleSizes.aiTriageRuns === 0
          ? 0
          : aiTriageFailureCount / sampleSizes.aiTriageRuns,
      aiSuggestionsAccepted,
      aiSuggestionAcceptanceRate:
        aiReviewsTotal === 0 ? 0 : aiSuggestionsAccepted / aiReviewsTotal,
      estimatedManualMinutesSaved:
        aiSuggestionsAccepted * getAcceptedAiMinutesSaved() +
        aiCorrectionsTotal * getCorrectedAiMinutesSaved(),
      casesPer1000Inhabitants: null as number | null,
    };
    let latestAnalyticsRebuiltAtIso: string | null = null;
    const ssbEnrichment = {
      status: 'missing',
      populationUsed: null as number | null,
      populationYear: null as number | null,
      casesPer1000Inhabitants: null as number | null,
      lastImportedAt: null as string | null,
    };

    const daily = snapshots.map((snapshot) => {
      const casesByStatus = jsonToCountMap(snapshot.casesByStatusJson);
      const casesByCategory = jsonToCountMap(snapshot.casesByCategoryJson);
      const casesByDepartment = jsonToCountMap(snapshot.casesByDepartmentJson);

      if (
        snapshot.analyticsRebuiltAt &&
        (!latestAnalyticsRebuiltAtIso ||
          snapshot.analyticsRebuiltAt.toISOString() >
            latestAnalyticsRebuiltAtIso)
      ) {
        latestAnalyticsRebuiltAtIso = snapshot.analyticsRebuiltAt.toISOString();
      }

      return {
        date: toDateKey(snapshot.date),
        totalCases: snapshot.totalCases,
        casesByStatus,
        casesByCategory,
        casesByDepartment,
        aiReviewsTotal: snapshot.aiReviewsTotal,
        aiCorrectionsTotal: snapshot.aiCorrectionsTotal,
        aiCorrectionRate: snapshot.aiCorrectionRate,
        averageTimeToTriageMinutes: snapshot.averageTimeToTriageMinutes,
        medianTimeToTriageMinutes: snapshot.medianTimeToTriageMinutes,
        averageTimeToCloseHours: snapshot.averageTimeToCloseHours,
        medianTimeToCloseHours: snapshot.medianTimeToCloseHours,
        casesWaitingForCitizen: snapshot.casesWaitingForCitizen,
        aiTriageSuccessCount: snapshot.aiTriageSuccessCount,
        aiTriageFailureCount: snapshot.aiTriageFailureCount,
        aiTriageFailureRate: snapshot.aiTriageFailureRate,
        aiSuggestionsAccepted: snapshot.aiSuggestionsAccepted,
        aiSuggestionAcceptanceRate: snapshot.aiSuggestionAcceptanceRate,
        estimatedManualMinutesSaved: snapshot.estimatedManualMinutesSaved,
        municipalityPopulation: snapshot.municipalityPopulation,
        municipalityPopulationYear: snapshot.municipalityPopulationYear,
        casesPer1000Inhabitants: snapshot.casesPer1000Inhabitants,
        ssbDataStatus: snapshot.ssbDataStatus,
        ssbImportedAt: snapshot.ssbImportedAt?.toISOString() ?? null,
        analyticsRebuiltAt: snapshot.analyticsRebuiltAt?.toISOString() ?? null,
      };
    });

    const latestPopulationSnapshot = [...snapshots]
      .reverse()
      .find((snapshot) => snapshot.municipalityPopulation !== null);

    if (latestPopulationSnapshot?.municipalityPopulation) {
      ssbEnrichment.status = latestPopulationSnapshot.ssbDataStatus;
      ssbEnrichment.populationUsed =
        latestPopulationSnapshot.municipalityPopulation;
      ssbEnrichment.populationYear =
        latestPopulationSnapshot.municipalityPopulationYear;
      ssbEnrichment.lastImportedAt =
        latestPopulationSnapshot.ssbImportedAt?.toISOString() ?? null;
      ssbEnrichment.casesPer1000Inhabitants =
        totals.totalCases === 0
          ? 0
          : (totals.totalCases /
              latestPopulationSnapshot.municipalityPopulation) *
            1000;
      totals.casesPer1000Inhabitants = ssbEnrichment.casesPer1000Inhabitants;
    }

    return {
      tenantId: user.tenantId,
      from: toDateKey(range.from),
      to: toDateKey(range.to),
      totals,
      sampleSizes,
      assumptions: {
        acceptedAiSuggestionMinutesSaved: getAcceptedAiMinutesSaved(),
        correctedAiSuggestionMinutesSaved: getCorrectedAiMinutesSaved(),
        estimatedManualMinutesSavedLabel:
          'Illustrative time-saving assumption, not a measured result.',
      },
      analyticsLastRebuiltAt: latestAnalyticsRebuiltAtIso,
      ssbEnrichment,
      daily,
    };
  }

  private async aggregateTenantDay(tenantId: string, date: Date) {
    const start = startOfUtcDay(date);
    const end = nextUtcDay(start);

    const [cases, aiReviews, aiTriageResults] = await Promise.all([
      this.prisma.case.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          id: true,
          createdAt: true,
          closedAt: true,
          status: true,
          category: true,
          assignedDepartment: {
            select: {
              slug: true,
            },
          },
          addresses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              municipalityCode: true,
            },
          },
          aiTriageResults: {
            orderBy: { createdAt: 'asc' },
            select: {
              createdAt: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.aIReview.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          wasAiSuggestionAccepted: true,
        },
      }),
      this.prisma.aITriageResult.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

    const aiSuggestionsAccepted = aiReviews.filter(
      (review) => review.wasAiSuggestionAccepted,
    ).length;
    const aiCorrectionsTotal = aiReviews.filter(
      (review) => !review.wasAiSuggestionAccepted,
    ).length;
    const aiCorrectionRate =
      aiReviews.length === 0 ? 0 : aiCorrectionsTotal / aiReviews.length;
    const aiSuggestionAcceptanceRate =
      aiReviews.length === 0 ? 0 : aiSuggestionsAccepted / aiReviews.length;
    const aiTriageSuccessCount = aiTriageResults.filter((result) =>
      ['completed', 'reviewed'].includes(result.status),
    ).length;
    const aiTriageFailureCount = aiTriageResults.filter(
      (result) => result.status === 'failed',
    ).length;
    const aiTriageFailureRate =
      aiTriageSuccessCount + aiTriageFailureCount === 0
        ? 0
        : aiTriageFailureCount / (aiTriageSuccessCount + aiTriageFailureCount);
    const triageDurations = getTimeToTriageMinutes(cases);
    const closeDurations = cases
      .filter((caseRecord) => caseRecord.closedAt !== null)
      .map(
        (caseRecord) =>
          (caseRecord.closedAt!.getTime() - caseRecord.createdAt.getTime()) /
          (1000 * 60 * 60),
      )
      .filter((duration) => duration >= 0);
    const estimatedManualMinutesSaved =
      aiSuggestionsAccepted * getAcceptedAiMinutesSaved() +
      aiCorrectionsTotal * getCorrectedAiMinutesSaved();
    const ssbEnrichment = await this.getSsbEnrichmentForCases(cases, start);
    const analyticsRebuiltAt = new Date();
    const effectMetrics = {
      averageTimeToTriageMinutes: average(triageDurations),
      medianTimeToTriageMinutes: median(triageDurations),
      averageTimeToCloseHours: average(closeDurations),
      medianTimeToCloseHours: median(closeDurations),
      casesWaitingForCitizen: cases.filter(
        (caseRecord) => caseRecord.status === 'waiting_for_citizen',
      ).length,
      aiTriageSuccessCount,
      aiTriageFailureCount,
      aiTriageFailureRate,
      aiSuggestionsAccepted,
      aiSuggestionAcceptanceRate,
      estimatedManualMinutesSaved,
      analyticsRebuiltAt,
    };

    await this.prisma.analyticsDailySnapshot.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: start,
        },
      },
      create: {
        tenantId,
        date: start,
        totalCases: cases.length,
        casesByStatusJson: countBy(cases, (caseRecord) => caseRecord.status),
        casesByCategoryJson: countBy(
          cases,
          (caseRecord) => caseRecord.category,
        ),
        casesByDepartmentJson: countBy(
          cases,
          (caseRecord) => caseRecord.assignedDepartment?.slug ?? 'unassigned',
        ),
        aiReviewsTotal: aiReviews.length,
        aiCorrectionsTotal,
        aiCorrectionRate,
        ...effectMetrics,
        municipalityPopulation: ssbEnrichment.population,
        municipalityPopulationYear: ssbEnrichment.populationYear,
        casesPer1000Inhabitants: ssbEnrichment.casesPer1000Inhabitants,
        ssbDataStatus: ssbEnrichment.status,
        ssbImportedAt: ssbEnrichment.importedAt,
      },
      update: {
        totalCases: cases.length,
        casesByStatusJson: countBy(cases, (caseRecord) => caseRecord.status),
        casesByCategoryJson: countBy(
          cases,
          (caseRecord) => caseRecord.category,
        ),
        casesByDepartmentJson: countBy(
          cases,
          (caseRecord) => caseRecord.assignedDepartment?.slug ?? 'unassigned',
        ),
        aiReviewsTotal: aiReviews.length,
        aiCorrectionsTotal,
        aiCorrectionRate,
        ...effectMetrics,
        municipalityPopulation: ssbEnrichment.population,
        municipalityPopulationYear: ssbEnrichment.populationYear,
        casesPer1000Inhabitants: ssbEnrichment.casesPer1000Inhabitants,
        ssbDataStatus: ssbEnrichment.status,
        ssbImportedAt: ssbEnrichment.importedAt,
      },
    });
  }

  private async getSsbEnrichmentForCases(
    cases: Array<{ addresses?: Array<{ municipalityCode: string | null }> }>,
    date: Date,
  ) {
    const municipalityCodes = cases
      .map((caseRecord) => caseRecord.addresses?.[0]?.municipalityCode)
      .filter((value): value is string => Boolean(value));

    if (municipalityCodes.length === 0) {
      return {
        status: 'missing',
        population: null,
        populationYear: null,
        casesPer1000Inhabitants: null,
        importedAt: null,
      };
    }

    const statistics =
      await this.ssbService.getLatestPopulationForMunicipalities(
        municipalityCodes,
        date.getUTCFullYear(),
      );
    const population = statistics.reduce(
      (sum, statistic) => sum + statistic.value,
      0,
    );
    const latestImportedAt = statistics
      .map((statistic) => statistic.importedAt)
      .sort((left, right) => right.getTime() - left.getTime())[0];

    if (population <= 0 || statistics.length === 0) {
      return {
        status: 'missing',
        population: null,
        populationYear: null,
        casesPer1000Inhabitants: null,
        importedAt: null,
      };
    }

    const completenessStatus =
      statistics.length === new Set(municipalityCodes).size
        ? 'available'
        : 'partial';

    return {
      status:
        latestImportedAt &&
        isOlderThanDays(latestImportedAt, SSB_STALE_AFTER_DAYS)
          ? 'stale'
          : completenessStatus,
      population,
      populationYear: date.getUTCFullYear(),
      casesPer1000Inhabitants: (cases.length / population) * 1000,
      importedAt: latestImportedAt ?? null,
    };
  }
}

function assertValidRange(range: AnalyticsRange) {
  if (range.from > range.to) {
    throw new BadRequestException(
      'Analytics from date must be before to date.',
    );
  }
}

function getDaysInclusive(from: Date, to: Date) {
  const days: Date[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function countBy<T>(items: T[], getKey: (item: T) => string): CountMap {
  return items.reduce<CountMap>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function jsonToCountMap(value: Prisma.JsonValue): CountMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<CountMap>((counts, [key, count]) => {
    if (typeof count === 'number') {
      counts[key] = count;
    }

    return counts;
  }, {});
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function nextUtcDay(date: Date) {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isOlderThanDays(date: Date, days: number) {
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function getTimeToTriageMinutes(
  cases: Array<{
    createdAt: Date;
    aiTriageResults: Array<{ createdAt: Date; status: string }>;
  }>,
) {
  return cases
    .map((caseRecord) => {
      const firstSuccessfulTriage = caseRecord.aiTriageResults.find((result) =>
        ['completed', 'reviewed'].includes(result.status),
      );

      if (!firstSuccessfulTriage) {
        return null;
      }

      return (
        (firstSuccessfulTriage.createdAt.getTime() -
          caseRecord.createdAt.getTime()) /
        (1000 * 60)
      );
    })
    .filter(
      (duration): duration is number => duration !== null && duration >= 0,
    );
}

function getTimeToCloseHours(
  cases: Array<{
    createdAt: Date;
    closedAt: Date | null;
  }>,
) {
  return cases
    .map((caseRecord) => {
      if (!caseRecord.closedAt) {
        return null;
      }

      return (
        (caseRecord.closedAt.getTime() - caseRecord.createdAt.getTime()) /
        (1000 * 60 * 60)
      );
    })
    .filter(
      (duration): duration is number => duration !== null && duration >= 0,
    );
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function getAcceptedAiMinutesSaved() {
  return getPositiveIntegerEnv(
    'ACCEPTED_AI_SUGGESTION_MINUTES_SAVED',
    DEFAULT_ACCEPTED_AI_MINUTES_SAVED,
  );
}

function getCorrectedAiMinutesSaved() {
  return getPositiveIntegerEnv(
    'CORRECTED_AI_SUGGESTION_MINUTES_SAVED',
    DEFAULT_CORRECTED_AI_MINUTES_SAVED,
  );
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
