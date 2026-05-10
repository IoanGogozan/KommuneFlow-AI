import { PrismaClient } from '@prisma/client';
import { tenants } from './data/tenants';
import { SeedContext } from './types';

export async function seedSsbStatistics(
  prisma: PrismaClient,
  context: SeedContext,
) {
  for (const tenantSpec of tenants) {
    await prisma.externalMunicipalityStatistic.upsert({
      where: {
        municipalityCode_statisticKey_year_sourceDataset: {
          municipalityCode: tenantSpec.municipalityCode,
          statisticKey: 'population_total',
          year: context.snapshotDate.getUTCFullYear(),
          sourceDataset: '07459',
        },
      },
      update: {
        municipalityName: tenantSpec.municipalityName,
        value: tenantSpec.population,
        unit: 'persons',
        importedAt: context.importedAt,
      },
      create: {
        municipalityCode: tenantSpec.municipalityCode,
        municipalityName: tenantSpec.municipalityName,
        statisticKey: 'population_total',
        statisticLabel: 'Population total',
        year: context.snapshotDate.getUTCFullYear(),
        value: tenantSpec.population,
        unit: 'persons',
        source: 'ssb',
        sourceDataset: '07459',
        importedAt: context.importedAt,
      },
    });
  }
}
