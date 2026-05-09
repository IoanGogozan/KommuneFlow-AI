import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../../configure-app';
import { DatabaseModule } from '../../../database/database.module';
import { PrismaService } from '../../../database/prisma.service';
import { AUTH_COOKIE_NAME } from '../../auth/auth.constants';
import { AuthModule } from '../../auth/auth.module';
import { SsbModule } from './ssb.module';
import { SsbService } from './ssb.service';

describe('SsbController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const ssbService = {
    importMunicipalityPopulation: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    ssbService.importMunicipalityPopulation.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule, SsbModule],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SsbService)
      .useValue(ssbService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 without authentication', () => {
    return request(app.getHttpServer())
      .post('/api/v1/integrations/ssb/imports/municipality-population')
      .send({
        year: 2025,
        municipalityCodes: ['4203'],
      })
      .expect(401);
  });

  it('returns 403 when the user cannot manage tenant data', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'department.admin@example.local',
      role: 'department_admin',
    });

    await request(app.getHttpServer())
      .post('/api/v1/integrations/ssb/imports/municipality-population')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .send({
        year: 2025,
        municipalityCodes: ['4203'],
      })
      .expect(403);
  });

  it('imports municipality population for super admins', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: 'super_admin',
    });
    ssbService.importMunicipalityPopulation.mockResolvedValue({
      importRunId: 'import_1',
      source: 'ssb',
      dataset: '07459',
      year: 2025,
      recordsImported: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/ssb/imports/municipality-population')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .send({
        year: 2025,
        municipalityCodes: ['4203'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      importRunId: 'import_1',
      source: 'ssb',
      dataset: '07459',
      year: 2025,
      recordsImported: 1,
    });
    expect(ssbService.importMunicipalityPopulation).toHaveBeenCalledWith({
      year: 2025,
      municipalityCodes: ['4203'],
    });
  });

  it('rejects invalid import payloads', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: 'super_admin',
    });

    await request(app.getHttpServer())
      .post('/api/v1/integrations/ssb/imports/municipality-population')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .send({
        year: 2025,
        municipalityCodes: ['invalid'],
      })
      .expect(400);
  });
});
