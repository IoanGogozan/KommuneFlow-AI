import { hoursAgo, startOfUtcDay } from './time';
import { SeedContext } from './types';

export function createSeedContext(now: Date): SeedContext {
  return {
    snapshotDate: startOfUtcDay(now),
    importedAt: hoursAgo(2),
    analyticsRebuiltAt: hoursAgo(1),
    tenantMap: new Map(),
    departmentMap: new Map(),
    adminByTenant: new Map(),
  };
}
