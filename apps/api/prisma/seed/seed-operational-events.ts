import { PrismaClient } from '@prisma/client';
import { tenants } from './data/tenants';
import { addMinutes, hoursAgo } from './time';
import { SeedContext } from './types';

const eventTemplates = [
  ['auth.login_failed', 'warning', 'auth', 'Login failed.'],
  [
    'security.permission_denied',
    'warning',
    'permissions_guard',
    'Permission denied.',
  ],
  ['api.error', 'error', 'api', 'Internal server error.'],
  ['document.upload_failed', 'warning', 'documents', 'Document upload failed.'],
  [
    'integration.kartverket.failed',
    'error',
    'kartverket_address',
    'Kartverket failed.',
  ],
  ['integration.ssb.failed', 'error', 'ssb', 'SSB import failed.'],
  [
    'maintenance.retention_cleanup',
    'info',
    'privacy',
    'Retention cleanup dry run completed.',
  ],
  [
    'public.rate_limited',
    'warning',
    'throttler',
    'Request rate limit exceeded.',
  ],
] as const;

export async function seedOperationalEvents(
  prisma: PrismaClient,
  context: SeedContext,
) {
  for (const tenantSpec of tenants) {
    const tenant = context.tenantMap.get(tenantSpec.slug)!;
    const admin = context.adminByTenant.get(tenantSpec.slug)!;

    await seedEventsForTenant(prisma, tenantSpec.slug, tenant.id, admin.id);
    await seedImportRun(prisma, context, tenantSpec);
    await seedMaintenanceRun(prisma, tenantSpec.slug);
  }
}

async function seedEventsForTenant(
  prisma: PrismaClient,
  tenantSlug: string,
  tenantId: string,
  adminUserId: string,
) {
  for (const [index, [eventType, severity, source, safeMessage]] of eventTemplates.entries()) {
    const id = `seed_${tenantSlug}_operational_${index + 1}`;
    const data = {
      tenantId,
      userId: adminUserId,
      eventType,
      severity,
      source,
      safeMessage,
      metadataJson: { source: 'prisma_seed' },
      createdAt: addMinutes(hoursAgo(3), index * 7),
    };

    await prisma.operationalEvent.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
}

async function seedImportRun(
  prisma: PrismaClient,
  context: SeedContext,
  tenantSpec: (typeof tenants)[number],
) {
  const data = {
    source: 'ssb',
    dataset: '07459',
    status: 'completed' as const,
    startedAt: context.importedAt,
    completedAt: addMinutes(context.importedAt, 1),
    recordsImported: 1,
    metadataJson: {
      municipalityCode: tenantSpec.municipalityCode,
      source: 'prisma_seed',
    },
  };

  await prisma.externalDataImportRun.upsert({
    where: { id: `seed_${tenantSpec.slug}_ssb_import_run` },
    update: data,
    create: { id: `seed_${tenantSpec.slug}_ssb_import_run`, ...data },
  });
}

async function seedMaintenanceRun(prisma: PrismaClient, tenantSlug: string) {
  const data = {
    type: 'retention_cleanup',
    status: 'completed',
    startedAt: hoursAgo(4),
    completedAt: addMinutes(hoursAgo(4), 2),
    safeMessage: 'Seeded retention cleanup dry run.',
    metadataJson: { source: 'prisma_seed' },
  };

  await prisma.maintenanceRun.upsert({
    where: { id: `seed_${tenantSlug}_retention_cleanup_run` },
    update: data,
    create: { id: `seed_${tenantSlug}_retention_cleanup_run`, ...data },
  });
}
