export function daysAgo(snapshotDate: Date, days: number) {
  const date = new Date(snapshotDate);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(9, 0, 0, 0);
  return date;
}

export function hoursAgo(hours: number) {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() - hours);
  return date;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
