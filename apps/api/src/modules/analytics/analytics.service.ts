import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { SsbService } from '../integrations/ssb/ssb.service';
import { AnalyticsRange } from './analytics.schemas';

type CountMap = Record<string, number>;
type WeightedValue = {
  value: number;
  weight: number;
};
const SSB_STALE_AFTER_DAYS = 395;
const DEFAULT_ACCEPTED_AI_MINUTES_SAVED = 5;
const DEFAULT_CORRECTED_AI_MINUTES_SAVED = 2;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ssbService: SsbService,
  ) {}

  async aggregateTenantRange(user: CurrentUser, range: AnalyticsRange) {
    assertValidRange(range);
    const days = getDaysInclusive(range.from, range.to);

    for (const date of days) {
      await this.aggregateTenantDay(user.tenantId, date);
    }

    return {
      tenantId: user.tenantId,
      from: toDateKey(range.from),
      to: toDateKey(range.to),
      daysAggregated: days.length,
    };
  }

  async getSummary(user: CurrentUser, range: AnalyticsRange) {
    assertValidRange(range);

    const snapshots = await this.prisma.analyticsDailySnapshot.findMany({
      where: {
        tenantId: user.tenantId,
        date: {
          gte: range.from,
          lte: range.to,
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
    });

    const totals = {
      totalCases: 0,
      casesByStatus: {} as CountMap,
      casesByCategory: {} as CountMap,
      casesByDepartment: {} as CountMap,
      aiReviewsTotal: 0,
      aiCorrectionsTotal: 0,
      aiCorrectionRate: 0,
      averageTimeToTriageMinutes: null as number | null,
      medianTimeToTriageMinutes: null as number | null,
      averageTimeToCloseHours: null as number | null,
      medianTimeToCloseHours: null as number | null,
      casesWaitingForCitizen: 0,
      aiTriageSuccessCount: 0,
      aiTriageFailureCount: 0,
      aiTriageFailureRate: 0,
      aiSuggestionsAccepted: 0,
      aiSuggestionAcceptanceRate: 0,
      estimatedManualMinutesSaved: 0,
      casesPer1000Inhabitants: null as number | null,
    };
    const weightedTriageAverageValues: WeightedValue[] = [];
    const weightedCloseAverageValues: WeightedValue[] = [];
    const medianTriageValues: number[] = [];
    const medianCloseValues: number[] = [];
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

      totals.totalCases += snapshot.totalCases;
      totals.casesByStatus = mergeCounts(totals.casesByStatus, casesByStatus);
      totals.casesByCategory = mergeCounts(
        totals.casesByCategory,
        casesByCategory,
      );
      totals.casesByDepartment = mergeCounts(
        totals.casesByDepartment,
        casesByDepartment,
      );
      totals.aiReviewsTotal += snapshot.aiReviewsTotal;
      totals.aiCorrectionsTotal += snapshot.aiCorrectionsTotal;
      totals.casesWaitingForCitizen += snapshot.casesWaitingForCitizen;
      totals.aiTriageSuccessCount += snapshot.aiTriageSuccessCount;
      totals.aiTriageFailureCount += snapshot.aiTriageFailureCount;
      totals.aiSuggestionsAccepted += snapshot.aiSuggestionsAccepted;
      totals.estimatedManualMinutesSaved +=
        snapshot.estimatedManualMinutesSaved;

      if (snapshot.averageTimeToTriageMinutes !== null) {
        weightedTriageAverageValues.push({
          value: snapshot.averageTimeToTriageMinutes,
          weight: snapshot.totalCases,
        });
      }

      if (snapshot.averageTimeToCloseHours !== null) {
        weightedCloseAverageValues.push({
          value: snapshot.averageTimeToCloseHours,
          weight: snapshot.totalCases,
        });
      }

      if (snapshot.medianTimeToTriageMinutes !== null) {
        medianTriageValues.push(snapshot.medianTimeToTriageMinutes);
      }

      if (snapshot.medianTimeToCloseHours !== null) {
        medianCloseValues.push(snapshot.medianTimeToCloseHours);
      }

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

    totals.aiCorrectionRate =
      totals.aiReviewsTotal === 0
        ? 0
        : totals.aiCorrectionsTotal / totals.aiReviewsTotal;
    totals.aiSuggestionAcceptanceRate =
      totals.aiReviewsTotal === 0
        ? 0
        : totals.aiSuggestionsAccepted / totals.aiReviewsTotal;
    totals.aiTriageFailureRate =
      totals.aiTriageSuccessCount + totals.aiTriageFailureCount === 0
        ? 0
        : totals.aiTriageFailureCount /
          (totals.aiTriageSuccessCount + totals.aiTriageFailureCount);
    totals.averageTimeToTriageMinutes = weightedAverage(
      weightedTriageAverageValues,
    );
    totals.averageTimeToCloseHours = weightedAverage(
      weightedCloseAverageValues,
    );
    totals.medianTimeToTriageMinutes = median(medianTriageValues);
    totals.medianTimeToCloseHours = median(medianCloseValues);

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
      assumptions: {
        acceptedAiSuggestionMinutesSaved: getAcceptedAiMinutesSaved(),
        correctedAiSuggestionMinutesSaved: getCorrectedAiMinutesSaved(),
        estimatedManualMinutesSavedLabel: 'Estimate, not exact measurement.',
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
              name: true,
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
          (caseRecord) => caseRecord.assignedDepartment?.name ?? 'Unassigned',
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
          (caseRecord) => caseRecord.assignedDepartment?.name ?? 'Unassigned',
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

function mergeCounts(left: CountMap, right: CountMap) {
  return Object.entries(right).reduce<CountMap>(
    (result, [key, value]) => ({
      ...result,
      [key]: (result[key] ?? 0) + value,
    }),
    { ...left },
  );
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

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(values: WeightedValue[]) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return null;
  }

  return (
    values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    totalWeight
  );
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
