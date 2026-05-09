import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AnalyticsRange } from './analytics.schemas';

type CountMap = Record<string, number>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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

      return {
        date: toDateKey(snapshot.date),
        totalCases: snapshot.totalCases,
        casesByStatus,
        casesByCategory,
        casesByDepartment,
        aiReviewsTotal: snapshot.aiReviewsTotal,
        aiCorrectionsTotal: snapshot.aiCorrectionsTotal,
        aiCorrectionRate: snapshot.aiCorrectionRate,
      };
    });

    totals.aiCorrectionRate =
      totals.aiReviewsTotal === 0
        ? 0
        : totals.aiCorrectionsTotal / totals.aiReviewsTotal;

    return {
      tenantId: user.tenantId,
      from: toDateKey(range.from),
      to: toDateKey(range.to),
      totals,
      daily,
    };
  }

  private async aggregateTenantDay(tenantId: string, date: Date) {
    const start = startOfUtcDay(date);
    const end = nextUtcDay(start);

    const [cases, aiReviews] = await Promise.all([
      this.prisma.case.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          status: true,
          category: true,
          assignedDepartment: {
            select: {
              name: true,
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
    ]);

    const aiCorrectionsTotal = aiReviews.filter(
      (review) => !review.wasAiSuggestionAccepted,
    ).length;
    const aiCorrectionRate =
      aiReviews.length === 0 ? 0 : aiCorrectionsTotal / aiReviews.length;

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
      },
    });
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
