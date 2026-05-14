import { PrismaClient, UserRole } from '@prisma/client';
import { departments } from './data/departments';
import { tenants } from './data/tenants';
import { SeedContext } from './types';

export async function seedTenantsDepartmentsAndUsers(
  prisma: PrismaClient,
  context: SeedContext,
  passwordHashes: {
    demoPasswordHash: string;
    recruiterPasswordHash: string;
  },
) {
  for (const tenantSpec of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSpec.slug },
      update: {
        name: tenantSpec.name,
        primaryLanguage: 'nb',
      },
      create: {
        name: tenantSpec.name,
        slug: tenantSpec.slug,
        primaryLanguage: 'nb',
      },
      select: { id: true },
    });
    context.tenantMap.set(tenantSpec.slug, tenant);

    await prisma.retentionPolicy.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { tenantId: tenant.id },
    });

    for (const departmentSpec of departments) {
      const department = await prisma.department.upsert({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: departmentSpec.slug,
          },
        },
        update: {
          name: departmentSpec.name,
          description: departmentSpec.description,
        },
        create: {
          tenantId: tenant.id,
          name: departmentSpec.name,
          slug: departmentSpec.slug,
          description: departmentSpec.description,
        },
        select: { id: true },
      });
      context.departmentMap.set(
        `${tenantSpec.slug}:${departmentSpec.slug}`,
        department,
      );
    }

    const admin = await createUser(prisma, {
      email:
        tenantSpec.slug === 'arendal'
          ? 'super.admin@kommuneflow.local'
          : `department.admin@${tenantSpec.slug}.local`,
      name:
        tenantSpec.slug === 'arendal'
          ? 'Super Admin'
          : `${tenantSpec.name} Department Admin`,
      role: tenantSpec.slug === 'arendal' ? 'super_admin' : 'department_admin',
      tenantId: tenant.id,
      departmentId: context.departmentMap.get(
        `${tenantSpec.slug}:technical_department`,
      )!.id,
      passwordHash: passwordHashes.demoPasswordHash,
    });
    context.adminByTenant.set(tenantSpec.slug, admin);

    if (tenantSpec.slug === 'kristiansand') {
      await createUser(prisma, {
        email: 'recruiter.demo@kristiansand.local',
        name: 'Kristiansand Recruiter Demo',
        role: 'department_admin',
        tenantId: tenant.id,
        departmentId: context.departmentMap.get(
          'kristiansand:technical_department',
        )!.id,
        passwordHash: passwordHashes.recruiterPasswordHash,
      });
    }

    await createUser(prisma, {
      email: `case.worker@${tenantSpec.slug}.local`,
      name: `${tenantSpec.name} Case Worker`,
      role: 'case_worker',
      tenantId: tenant.id,
      departmentId: context.departmentMap.get(
        `${tenantSpec.slug}:technical_department`,
      )!.id,
      passwordHash: passwordHashes.demoPasswordHash,
    });

    await createUser(prisma, {
      email: `auditor@${tenantSpec.slug}.local`,
      name: `${tenantSpec.name} Auditor`,
      role: 'auditor',
      tenantId: tenant.id,
      departmentId: null,
      passwordHash: passwordHashes.demoPasswordHash,
    });
  }
}

async function createUser(
  prisma: PrismaClient,
  input: {
    email: string;
    name: string;
    role: UserRole;
    tenantId: string;
    departmentId: string | null;
    passwordHash: string;
  },
) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      departmentId: input.departmentId,
      status: 'active',
      passwordHash: input.passwordHash,
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      departmentId: input.departmentId,
      passwordHash: input.passwordHash,
      status: 'active',
    },
    select: { id: true, email: true },
  });
}
