import { z } from 'zod';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date format YYYY-MM-DD');

export const analyticsRangeSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .transform((value) => ({
    from: value.from ? parseUtcDate(value.from) : daysAgoUtc(30),
    to: value.to ? parseUtcDate(value.to) : startOfUtcDay(new Date()),
  }));

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

function parseUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysAgoUtc(days: number) {
  const date = startOfUtcDay(new Date());
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
