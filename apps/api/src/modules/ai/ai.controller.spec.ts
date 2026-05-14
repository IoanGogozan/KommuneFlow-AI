import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AIDiagnosticsController, AIStatusController } from './ai.controller';
import { AIService } from './ai.service';

describe('AIDiagnosticsController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const aiService = {
    getProviderDiagnostics: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    aiService.getProviderDiagnostics.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [AIDiagnosticsController],
      providers: [AIService],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AIService)
      .useValue(aiService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication for AI diagnostics', () => {
    return request(app.getHttpServer())
      .get('/api/v1/internal/ai/diagnostics')
      .expect(401);
  });

  it('rejects authenticated users without AI diagnostics permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'department.admin@example.local',
      role: 'department_admin',
    });

    await request(app.getHttpServer())
      .get('/api/v1/internal/ai/diagnostics')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(aiService.getProviderDiagnostics).not.toHaveBeenCalled();
  });

  it('returns safe provider diagnostics for super admins', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: 'super_admin',
    });
    aiService.getProviderDiagnostics.mockReturnValue({
      provider: 'openai',
      status: 'not_ready',
      issues: ['OPENAI_API_KEY is required when AI_PROVIDER=openai.'],
      openai: {
        apiKeyConfigured: false,
        model: 'gpt-4o-mini',
        timeoutMs: 15000,
        maxAttempts: 2,
        externalCallsDisabledInCi: false,
      },
      mock: {
        available: true,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/internal/ai/diagnostics')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toMatchObject({
      provider: 'openai',
      status: 'not_ready',
      openai: {
        apiKeyConfigured: false,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('test-openai-key');
  });
});

describe('AIStatusController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const aiService = {
    getProviderStatus: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    aiService.getProviderStatus.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [AIStatusController],
      providers: [AIService],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AIService)
      .useValue(aiService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication for AI status', () => {
    return request(app.getHttpServer()).get('/api/v1/ai/status').expect(401);
  });

  it('rejects authenticated users without operations or AI diagnostics permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });

    await request(app.getHttpServer())
      .get('/api/v1/ai/status')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(aiService.getProviderStatus).not.toHaveBeenCalled();
  });

  it('returns AI status for operations users', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'department.admin@example.local',
      role: 'department_admin',
    });
    aiService.getProviderStatus.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      configured: false,
      timeoutMs: 15000,
      maxAttempts: 2,
      ciDisabled: false,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/ai/status')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual({
      provider: 'openai',
      model: 'gpt-4o-mini',
      configured: false,
      timeoutMs: 15000,
      maxAttempts: 2,
      ciDisabled: false,
    });
    expect(JSON.stringify(response.body)).not.toContain('test-openai-key');
  });

  it('returns AI status for AI diagnostics users', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: 'super_admin',
    });
    aiService.getProviderStatus.mockReturnValue({
      provider: 'mock',
      model: null,
      configured: true,
      timeoutMs: 15000,
      maxAttempts: 2,
      ciDisabled: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/ai/status')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);
    expect(aiService.getProviderStatus).toHaveBeenCalledTimes(1);
  });
});
