import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { cases } from './seed/data/cases';
import { hoursAgo, startOfUtcDay } from './seed/time';
import { SeedContext } from './seed/types';
import { seedAnalytics } from './seed/seed-analytics';
import { seedCases } from './seed/seed-cases';
import { seedOperationalEvents } from './seed/seed-operational-events';
import { seedSsbStatistics } from './seed/seed-ssb';
import { seedTenantsDepartmentsAndUsers } from './seed/seed-users';

config({ path: '../../.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const context: SeedContext = {
    snapshotDate: startOfUtcDay(new Date()),
    importedAt: hoursAgo(2),
    analyticsRebuiltAt: hoursAgo(1),
    tenantMap: new Map(),
    departmentMap: new Map(),
    adminByTenant: new Map(),
  };
  const demoPasswordHash = await hash(
    getSeedPassword('SEED_DEMO_PASSWORD'),
    12,
  );
  const recruiterPasswordHash = await hash(
    getSeedPassword('SEED_RECRUITER_PASSWORD', 'SEED_DEMO_PASSWORD'),
    12,
  );

  await seedTenantsDepartmentsAndUsers(prisma, context, {
    demoPasswordHash,
    recruiterPasswordHash,
  });
  await seedSsbStatistics(prisma, context);
  await seedCases(prisma, cases, context);
  await seedAnalytics(prisma, context);
  await seedOperationalEvents(prisma, context);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

function getSeedPassword(primaryName: string, fallbackName?: string) {
  return (
    process.env[primaryName] ??
    (fallbackName ? process.env[fallbackName] : undefined) ??
    'DemoPassword123!'
  );
}
