import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '../../.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash('DemoPassword123!', 12);

  const arendal = await prisma.tenant.upsert({
    where: { slug: 'arendal' },
    update: {},
    create: {
      name: 'Arendal Kommune',
      slug: 'arendal',
      primaryLanguage: 'nb',
    },
  });

  const grimstad = await prisma.tenant.upsert({
    where: { slug: 'grimstad' },
    update: {},
    create: {
      name: 'Grimstad Kommune',
      slug: 'grimstad',
      primaryLanguage: 'nb',
    },
  });

  const arendalTechnical = await prisma.department.upsert({
    where: {
      tenantId_slug: {
        tenantId: arendal.id,
        slug: 'technical_department',
      },
    },
    update: {},
    create: {
      tenantId: arendal.id,
      name: 'Technical Department',
      slug: 'technical_department',
      description: 'Building cases, roads, water, waste, and technical services.',
    },
  });

  const arendalSchool = await prisma.department.upsert({
    where: {
      tenantId_slug: {
        tenantId: arendal.id,
        slug: 'kindergarten_school',
      },
    },
    update: {},
    create: {
      tenantId: arendal.id,
      name: 'Kindergarten and School',
      slug: 'kindergarten_school',
      description: 'Kindergarten, school, and education-related municipal services.',
    },
  });

  const grimstadTechnical = await prisma.department.upsert({
    where: {
      tenantId_slug: {
        tenantId: grimstad.id,
        slug: 'technical_department',
      },
    },
    update: {},
    create: {
      tenantId: grimstad.id,
      name: 'Technical Department',
      slug: 'technical_department',
      description: 'Building cases, roads, water, waste, and technical services.',
    },
  });

  await createUser({
    email: 'super.admin@kommuneflow.local',
    name: 'Super Admin',
    role: 'super_admin',
    tenantId: arendal.id,
    departmentId: null,
    passwordHash,
  });

  await createUser({
    email: 'case.worker@arendal.local',
    name: 'Arendal Case Worker',
    role: 'case_worker',
    tenantId: arendal.id,
    departmentId: arendalTechnical.id,
    passwordHash,
  });

  await createUser({
    email: 'department.admin@arendal.local',
    name: 'Arendal Department Admin',
    role: 'department_admin',
    tenantId: arendal.id,
    departmentId: arendalTechnical.id,
    passwordHash,
  });

  await createUser({
    email: 'auditor@arendal.local',
    name: 'Arendal Auditor',
    role: 'auditor',
    tenantId: arendal.id,
    departmentId: null,
    passwordHash,
  });

  await createUser({
    email: 'case.worker@grimstad.local',
    name: 'Grimstad Case Worker',
    role: 'case_worker',
    tenantId: grimstad.id,
    departmentId: grimstadTechnical.id,
    passwordHash,
  });

  const citizen = await prisma.citizenProfile.upsert({
    where: {
      id: 'seed_arendal_citizen_profile',
    },
    update: {},
    create: {
      id: 'seed_arendal_citizen_profile',
      tenantId: arendal.id,
      name: 'Demo Citizen',
      email: 'citizen@example.local',
      phone: '+47 400 00 000',
      address: 'Demo Street 1, 4800 Arendal',
    },
  });

  await prisma.case.upsert({
    where: {
      id: 'seed_arendal_case_technical',
    },
    update: {},
    create: {
      id: 'seed_arendal_case_technical',
      tenantId: arendal.id,
      citizenProfileId: citizen.id,
      assignedDepartmentId: arendalTechnical.id,
      title: 'Request about building permit',
      description: 'I need information about documentation required for a garage extension.',
      category: 'building_case',
      status: 'new',
      urgency: 'normal',
      sourceLanguage: 'en',
    },
  });

  await prisma.auditEvent.upsert({
    where: {
      id: 'seed_audit_event_phase_2',
    },
    update: {},
    create: {
      id: 'seed_audit_event_phase_2',
      tenantId: arendal.id,
      actorRole: 'system',
      action: 'seed.created',
      entityType: 'tenant',
      entityId: arendal.id,
      metadataJson: { source: 'prisma_seed' },
    },
  });

  await prisma.department.update({
    where: { id: arendalSchool.id },
    data: { description: 'Kindergarten, school, and education-related municipal services.' },
  });
}

async function createUser(input: {
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  departmentId: string | null;
  passwordHash: string;
}) {
  await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      departmentId: input.departmentId,
      status: 'active',
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
  });
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
