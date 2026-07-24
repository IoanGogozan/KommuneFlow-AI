import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { cases } from './seed/data/cases';
import { createDemoSeedContext, rebuildDemoAnalytics } from './seed/analytics-baseline';
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
  const context = createDemoSeedContext(new Date());
  const demoPasswordHash = await hash(
    getSeedPassword('SEED_DEMO_PASSWORD'),
    12,
  );
  const recruiterPasswordHash = await hash(
    getSeedPassword('SEED_RECRUITER_PASSWORD', 'SEED_DEMO_PASSWORD'),
    12,
  );
  const portfolioGuestPasswordHash = await hash(
    randomBytes(32).toString('hex'),
    12,
  );

  await seedTenantsDepartmentsAndUsers(prisma, context, {
    demoPasswordHash,
    recruiterPasswordHash,
    portfolioGuestPasswordHash,
  });
  await seedSsbStatistics(prisma, context);
  await seedCases(prisma, cases, context);
  await rebuildDemoAnalytics(prisma, context);
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
