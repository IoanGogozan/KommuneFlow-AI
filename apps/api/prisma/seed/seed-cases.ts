import { PrismaClient } from '@prisma/client';
import { tenants } from './data/tenants';
import { DemoCase, SeedContext } from './types';
import { addHours, addMinutes, daysAgo } from './time';
import { seedAi } from './seed-ai';
import { seedCaseAudit } from './seed-audit';
import { seedDocuments } from './seed-documents';

export async function seedCases(
  prisma: PrismaClient,
  cases: DemoCase[],
  context: SeedContext,
) {
  for (const demoCase of cases) {
    await seedCase(prisma, demoCase, context);
  }
}

async function seedCase(
  prisma: PrismaClient,
  demoCase: DemoCase,
  context: SeedContext,
) {
  const tenant = context.tenantMap.get(demoCase.tenantSlug)!;
  const tenantSpec = tenants.find((item) => item.slug === demoCase.tenantSlug)!;
  const department = context.departmentMap.get(
    `${demoCase.tenantSlug}:${demoCase.departmentSlug}`,
  )!;
  const admin = context.adminByTenant.get(demoCase.tenantSlug)!;
  const createdAt = daysAgo(context.snapshotDate, demoCase.createdDaysAgo);
  const closedAt = demoCase.closeAfterHours
    ? addHours(createdAt, demoCase.closeAfterHours)
    : null;

  const citizen = await prisma.citizenProfile.upsert({
    where: { id: `${demoCase.id}_citizen` },
    update: {
      tenantId: tenant.id,
      name: demoCase.citizenName,
      email: demoCase.citizenEmail,
      phone: demoCase.citizenPhone,
      address: demoCase.address,
    },
    create: {
      id: `${demoCase.id}_citizen`,
      tenantId: tenant.id,
      name: demoCase.citizenName,
      email: demoCase.citizenEmail,
      phone: demoCase.citizenPhone,
      address: demoCase.address,
      createdAt,
    },
  });

  await prisma.case.upsert({
    where: { id: demoCase.id },
    update: caseData(demoCase, tenant.id, citizen.id, department.id, createdAt, closedAt),
    create: {
      id: demoCase.id,
      ...caseData(demoCase, tenant.id, citizen.id, department.id, createdAt, closedAt),
    },
  });

  await seedAddress(prisma, demoCase, tenant.id, tenantSpec, createdAt);
  await seedDocuments(prisma, demoCase, tenant.id, citizen.id, admin.id, createdAt);
  await seedAi(prisma, demoCase, tenant.id, department.id, admin.id, createdAt);
  await seedCaseAudit(prisma, demoCase, tenant.id, citizen.id, admin.id);
}

function caseData(
  demoCase: DemoCase,
  tenantId: string,
  citizenProfileId: string,
  departmentId: string,
  createdAt: Date,
  closedAt: Date | null,
) {
  return {
    tenantId,
    citizenProfileId,
    assignedDepartmentId: departmentId,
    title: demoCase.title,
    description: demoCase.description,
    category: demoCase.category,
    status: demoCase.status,
    urgency: demoCase.urgency,
    sourceLanguage: demoCase.sourceLanguage,
    createdAt,
    closedAt,
  };
}

async function seedAddress(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  tenantSpec: (typeof tenants)[number],
  createdAt: Date,
) {
  await prisma.caseAddress.upsert({
    where: { id: `${demoCase.id}_address` },
    update: addressData(demoCase, tenantId, tenantSpec, createdAt),
    create: {
      id: `${demoCase.id}_address`,
      ...addressData(demoCase, tenantId, tenantSpec, createdAt),
      createdAt,
    },
  });
}

function addressData(
  demoCase: DemoCase,
  tenantId: string,
  tenantSpec: (typeof tenants)[number],
  createdAt: Date,
) {
  return {
    tenantId,
    caseId: demoCase.id,
    originalInput: demoCase.address,
    normalizedAddress: demoCase.normalizedAddress,
    municipalityCode: tenantSpec.municipalityCode,
    municipalityName: tenantSpec.municipalityName,
    postalCode: demoCase.postalCode,
    latitude: 58.15,
    longitude: 8.01,
    source: 'kartverket' as const,
    sourceReferenceId: `${tenantSpec.municipalityCode}-${demoCase.id}`,
    validationStatus: 'validated' as const,
    validatedAt: addMinutes(createdAt, 1),
  };
}
