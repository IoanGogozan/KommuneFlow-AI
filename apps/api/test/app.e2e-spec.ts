import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from '../src/configure-app';
import { appLogger } from '../src/shared/logging/app-logger';
import { PrismaService } from '../src/database/prisma.service';

type ErrorResponseBody = {
  error: {
    code: string;
    message?: string;
    requestId: string;
    path?: string;
  };
};

type HealthResponseBody = {
  status: 'ok';
  service: 'kommuneflow-api';
  timestamp: string;
};

type ReadinessResponseBody = {
  status: 'ready' | 'not_ready';
  checks: {
    database: { status: 'ok' | 'error' };
    uploadStorage: { status: 'ok' | 'error' };
  };
  timestamp: string;
};

type PublicCaseResponseBody = {
  caseId: string;
  caseReference: string;
  statusAccessCode: string;
  status: string;
  documentCount: number;
};

type LoginResponseBody = {
  user: {
    id: string;
    tenantId: string;
    departmentId: string | null;
    email: string;
    role: string;
  };
};

type AiTriageResponseBody = {
  id: string;
  status: string;
  suggestedCategory: string;
  suggestedDepartment: {
    slug: string;
  } | null;
  suggestedUrgency: string;
};

type InternalCaseListItem = {
  id: string;
  title: string;
  status: string;
  assignedDepartment: {
    id: string;
    slug: string;
  } | null;
};

type InternalNoteResponseBody = {
  id: string;
  body: string;
};

type DocumentResponseBody = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

type AnalyticsSummaryResponseBody = {
  totals: {
    totalCases: number;
    aiReviewsTotal: number;
    aiSuggestionsAccepted: number;
    aiTriageSuccessCount: number;
    estimatedManualMinutesSaved: number;
    casesPer1000Inhabitants: number | null;
  };
  analyticsLastRebuiltAt: string | null;
  ssbEnrichment: {
    status: string;
    populationUsed: number | null;
  };
};

type OperationsMetricsResponseBody = {
  aiTriageRequestsLast24h: number;
  rateLimitBlocksLast24h: number;
  kartverketLookupCountLast24h: number;
  analyticsLastRebuildAt: string | null;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tenantsToDelete: string[] = [];
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('sets security headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
    expect(response.headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
  });

  it('allows configured CORS origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', process.env.APP_BASE_URL ?? 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(
      process.env.APP_BASE_URL ?? 'http://localhost:3000',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow arbitrary CORS origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', 'https://evil.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects cookie-authenticated state changes from invalid origins', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('Cookie', ['kommuneflow_access_token=fake-token'])
      .expect(403);

    expect(response.body).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid request origin.',
      },
    });
  });

  it('allows cookie-authenticated state changes from configured origins', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', process.env.APP_BASE_URL ?? 'http://localhost:3000')
      .set('Cookie', ['kommuneflow_access_token=fake-token'])
      .expect(201);
  });

  it('returns a safe error for invalid JSON bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/tenants/arendal/cases')
      .set('Content-Type', 'application/json')
      .send('{"citizen":')
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
      },
    });
  });

  it('returns a safe error for unsupported HTTP methods', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/health')
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('TypeError');
  });

  it('does not leak stack traces when external integrations fail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ upstream: 'failure' }),
    });

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
      )
      .query({ q: 'Storgata 12' })
      .expect(502);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('BAD_GATEWAY');
    expect(body.error.message).toBe('Address lookup is unavailable.');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('BadGatewayException');
    expect(JSON.stringify(body)).not.toContain('upstream');
  });

  it('rate limits public address search abuse', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ adresser: [] }),
    });

    for (let index = 0; index < 20; index += 1) {
      await request(app.getHttpServer())
        .get(
          '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
        )
        .query({ q: 'Storgata 12' })
        .expect(200);
    }

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
      )
      .query({ q: 'Storgata 12' })
      .expect(429);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(JSON.stringify(body)).not.toContain('stack');
    await expect(
      prisma.operationalEvent.findFirstOrThrow({
        where: {
          eventType: 'public.rate_limited',
          requestId: body.error.requestId,
        },
      }),
    ).resolves.toMatchObject({
      severity: 'warning',
      source: 'throttler',
      safeMessage: 'Request rate limit exceeded.',
    });
  });

  it('does not expose a public read endpoint for guessed citizen cases', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/tenants/arendal/cases/case_from_another_citizen')
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('rejects oversized JSON bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/tenants/arendal/cases')
      .set('Content-Type', 'application/json')
      .send({
        citizen: {
          name: 'Demo Citizen',
          email: 'citizen@example.local',
        },
        case: {
          title: 'Oversized request',
          description: 'x'.repeat(1024 * 1024 + 1),
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      })
      .expect(413);

    expect(response.body).toMatchObject({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  });

  it('adds a generated request ID response header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toHaveLength(36);
  });

  it('reuses a safe incoming request ID', async () => {
    const requestId = 'req_test-12345678';

    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
  });

  it('replaces an unsafe incoming request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', '../bad request id')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toBe('../bad request id');
  });

  it('uses the request ID in structured error responses', async () => {
    const requestId = 'req_error-12345678';
    const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation();

    const response = await request(app.getHttpServer())
      .get('/api/v1/not-found')
      .set('X-Request-Id', requestId)
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(body.error.requestId).toBe(requestId);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_error',
        requestId,
        errorCode: 'NOT_FOUND',
        method: 'GET',
        path: '/api/v1/not-found',
        statusCode: 404,
      }),
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('cookie');
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('authorization');

    warnSpy.mockRestore();
  });

  it('does not include query-string secrets in error paths or logs', async () => {
    const requestId = 'req_safe-path-12345678';
    const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation();

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/tenants/arendal/cases/status')
      .query({
        caseReference: 'KF-2026-SECRET',
        statusAccessCode: 'SECRET-CODE-123',
      })
      .set('X-Request-Id', requestId)
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.requestId).toBe(requestId);
    expect(body.error.path).toBe('/api/v1/public/tenants/arendal/cases/status');
    expect(JSON.stringify(body)).not.toContain('SECRET-CODE-123');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_error',
        requestId,
        path: '/api/v1/public/tenants/arendal/cases/status',
      }),
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('SECRET-CODE-123');

    warnSpy.mockRestore();
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    const body = response.body as unknown as HealthResponseBody;

    expect(body.status).toBe('ok');
    expect(body.service).toBe('kommuneflow-api');
    expect(typeof body.timestamp).toBe('string');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('/api/v1/readiness (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/readiness')
      .expect((result) => {
        expect([200, 503]).toContain(result.status);
      });
    const body = response.body as unknown as ReadinessResponseBody;

    if (response.status === 200) {
      expect(body.status).toBe('ready');
      expect(['ok', 'error']).toContain(body.checks.database.status);
      expect(['ok', 'error']).toContain(body.checks.uploadStorage.status);
      expect(typeof body.timestamp).toBe('string');
    } else {
      const errorBody = response.body as unknown as ErrorResponseBody;
      expect(errorBody.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(errorBody.error.requestId).toEqual(expect.any(String));
    }

    expect(JSON.stringify(body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(body)).not.toContain('UPLOAD_STORAGE_PATH');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('covers the citizen intake to internal triage business flow', async () => {
    const suffix = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const tenantSlug = `business-flow-${suffix}`;
    const userEmail = `worker.${suffix}@example.local`;
    const password = 'correct-horse-battery-staple';
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const allowedOrigin = process.env.APP_BASE_URL ?? 'http://localhost:3000';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        adresser: [
          {
            adressetekst: 'Storgata 12',
            adressekode: '12345',
            nummer: 12,
            kommunenummer: '9901',
            kommunenavn: 'E2Evik',
            postnummer: '4836',
            poststed: 'Arendal',
            representasjonspunkt: {
              lat: 58.4612,
              lon: 8.7724,
            },
          },
        ],
      }),
    });

    const { tenant, department } = await createBusinessFlowFixture(prisma, {
      tenantSlug,
      userEmail,
      password,
      year: today.getUTCFullYear(),
    });
    tenantsToDelete.push(tenant.id);

    const publicCaseResponse = await request(app.getHttpServer())
      .post(`/api/v1/public/tenants/${tenantSlug}/cases`)
      .field(
        'payload',
        JSON.stringify({
          citizen: {
            name: 'E2E Citizen',
            email: `citizen.${suffix}@example.local`,
            phone: '+47 40000000',
            address: 'Storgata 12, Arendal',
          },
          case: {
            title: 'Water leak near school entrance',
            description:
              'There is a water leak near the school entrance and the road is slippery for children and staff.',
            sourceLanguage: 'en',
          },
          privacyAccepted: true,
        }),
      )
      .attach('documents', Buffer.from('%PDF-1.4\n%EOF'), {
        filename: 'citizen-upload.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const publicCaseBody =
      publicCaseResponse.body as unknown as PublicCaseResponseBody;

    expect(publicCaseBody.status).toBe('new');
    expect(publicCaseBody.caseReference).toEqual(expect.stringMatching(/^KF-/));
    expect(publicCaseBody.statusAccessCode).toEqual(expect.any(String));
    expect(publicCaseBody.documentCount).toBe(1);
    await expect(
      prisma.emailLog.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          caseId: publicCaseBody.caseId,
          template: 'case_confirmation',
        },
      }),
    ).resolves.toMatchObject({
      provider: 'mock',
      status: 'logged',
      recipientEmail: `citizen.${suffix}@example.local`,
    });

    await prisma.case.update({
      where: { id: publicCaseBody.caseId },
      data: {
        assignedDepartmentId: department.id,
        status: 'triage_pending',
      },
    });

    const agent = request.agent(app.getHttpServer());
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password })
      .expect(201);
    const loginBody = loginResponse.body as unknown as LoginResponseBody;

    expect(loginBody.user.tenantId).toBe(tenant.id);
    expect(loginBody.user.departmentId).toBe(department.id);

    const caseListResponse = await agent.get('/api/v1/cases').expect(200);
    const caseListBody =
      caseListResponse.body as unknown as InternalCaseListItem[];

    const listedCase = caseListBody.find(
      (caseItem) => caseItem.id === publicCaseBody.caseId,
    );

    expect(listedCase).toBeDefined();
    expect(listedCase).toMatchObject({
      id: publicCaseBody.caseId,
      title: 'Water leak near school entrance',
      status: 'triage_pending',
    });
    expect(listedCase?.assignedDepartment?.id).toBe(department.id);
    expect(listedCase?.assignedDepartment?.slug).toBe(department.slug);

    const caseDetailResponse = await agent
      .get(`/api/v1/cases/${publicCaseBody.caseId}`)
      .expect(200);

    expect(caseDetailResponse.body).toMatchObject({
      id: publicCaseBody.caseId,
      status: 'triage_pending',
      addresses: [
        expect.objectContaining({
          validationStatus: 'validated',
          municipalityCode: '9901',
          municipalityName: 'E2Evik',
        }),
      ],
    });

    const internalUploadResponse = await agent
      .post(`/api/v1/cases/${publicCaseBody.caseId}/documents`)
      .set('Origin', allowedOrigin)
      .field('isSensitive', 'false')
      .attach('file', Buffer.from('%PDF-1.4\ninternal\n%EOF'), {
        filename: 'internal-upload.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const internalUploadBody =
      internalUploadResponse.body as unknown as DocumentResponseBody;

    expect(internalUploadBody).toMatchObject({
      originalFileName: 'internal-upload.pdf',
      mimeType: 'application/pdf',
    });

    const documentListResponse = await agent
      .get(`/api/v1/cases/${publicCaseBody.caseId}/documents`)
      .expect(200);
    const documentListBody =
      documentListResponse.body as unknown as DocumentResponseBody[];

    expect(documentListBody).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: internalUploadBody.id,
          originalFileName: 'internal-upload.pdf',
          mimeType: 'application/pdf',
        }),
        expect.objectContaining({
          originalFileName: 'citizen-upload.pdf',
          mimeType: 'application/pdf',
        }),
      ]),
    );

    const downloadResponse = await agent
      .get(
        `/api/v1/cases/${publicCaseBody.caseId}/documents/${internalUploadBody.id}/download`,
      )
      .expect(200);

    expect(downloadResponse.headers['content-type']).toBe('application/pdf');
    expect(downloadResponse.headers['content-disposition']).toContain(
      'internal-upload.pdf',
    );
    expect(Number(downloadResponse.headers['content-length'])).toBe(
      internalUploadBody.sizeBytes,
    );

    const aiTriageResponse = await agent
      .post(`/api/v1/cases/${publicCaseBody.caseId}/ai-triage`)
      .set('Origin', allowedOrigin)
      .expect(201);
    const aiTriageBody =
      aiTriageResponse.body as unknown as AiTriageResponseBody;

    expect(aiTriageBody.status).toBe('completed');
    expect(aiTriageBody.suggestedDepartment?.slug).toBe(department.slug);

    await agent
      .post(
        `/api/v1/cases/${publicCaseBody.caseId}/ai-triage/${aiTriageBody.id}/review`,
      )
      .set('Origin', allowedOrigin)
      .send({
        approvedCategory: aiTriageBody.suggestedCategory,
        approvedDepartmentSlug: department.slug,
        approvedUrgency: aiTriageBody.suggestedUrgency,
        reviewComment: 'Approved in e2e business flow.',
        wasAiSuggestionAccepted: true,
      })
      .expect(201);

    const internalNoteResponse = await agent
      .post(`/api/v1/cases/${publicCaseBody.caseId}/internal-notes`)
      .set('Origin', allowedOrigin)
      .send({
        body: 'Citizen should confirm whether the entrance is still slippery.',
      })
      .expect(201);
    const internalNoteBody =
      internalNoteResponse.body as unknown as InternalNoteResponseBody;

    expect(internalNoteBody).toMatchObject({
      body: 'Citizen should confirm whether the entrance is still slippery.',
    });

    await agent
      .patch(`/api/v1/cases/${publicCaseBody.caseId}/status`)
      .set('Origin', allowedOrigin)
      .send({ status: 'waiting_for_citizen' })
      .expect(200);

    const updatedCaseDetailResponse = await agent
      .get(`/api/v1/cases/${publicCaseBody.caseId}`)
      .expect(200);

    expect(updatedCaseDetailResponse.body).toMatchObject({
      id: publicCaseBody.caseId,
      status: 'waiting_for_citizen',
      internalNotes: [
        expect.objectContaining({
          id: internalNoteBody.id,
          body: 'Citizen should confirm whether the entrance is still slippery.',
        }),
      ],
    });

    const publicStatusResponse = await request(app.getHttpServer())
      .get(`/api/v1/public/tenants/${tenantSlug}/cases/status`)
      .query({
        caseReference: publicCaseBody.caseReference.toLowerCase(),
        statusAccessCode: publicCaseBody.statusAccessCode.toLowerCase(),
      })
      .expect(200);

    expect(publicStatusResponse.body).toMatchObject({
      caseReference: publicCaseBody.caseReference,
      title: 'Water leak near school entrance',
      status: 'waiting_for_citizen',
      assignedDepartmentName: 'Technical Department',
    });
    expect(JSON.stringify(publicStatusResponse.body)).not.toContain(
      `citizen.${suffix}@example.local`,
    );
    expect(JSON.stringify(publicStatusResponse.body)).not.toContain(
      'E2E Citizen',
    );
    expect(JSON.stringify(publicStatusResponse.body)).not.toContain(
      'Approved in e2e business flow.',
    );
    await expect(
      prisma.emailLog.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          caseId: publicCaseBody.caseId,
          template: 'case_status_changed',
        },
      }),
    ).resolves.toMatchObject({
      provider: 'mock',
      status: 'logged',
      recipientEmail: `citizen.${suffix}@example.local`,
    });

    await agent
      .post('/api/v1/analytics/aggregate')
      .set('Origin', allowedOrigin)
      .send({ from: todayKey, to: todayKey })
      .expect(201);

    const analyticsResponse = await agent
      .get('/api/v1/analytics/summary')
      .query({ from: todayKey, to: todayKey })
      .expect(200);
    const analyticsBody =
      analyticsResponse.body as unknown as AnalyticsSummaryResponseBody;

    expect(analyticsBody.totals.totalCases).toBeGreaterThanOrEqual(1);
    expect(analyticsBody.totals.aiReviewsTotal).toBeGreaterThanOrEqual(1);
    expect(analyticsBody.totals.aiSuggestionsAccepted).toBeGreaterThanOrEqual(
      1,
    );
    expect(analyticsBody.totals.aiTriageSuccessCount).toBeGreaterThanOrEqual(1);
    expect(analyticsBody.totals.estimatedManualMinutesSaved).toBeGreaterThan(0);
    expect(analyticsBody.analyticsLastRebuiltAt).toEqual(expect.any(String));
    expect(analyticsBody.ssbEnrichment).toMatchObject({
      status: 'available',
      populationUsed: 45_000,
    });
    expect(analyticsBody.totals.casesPer1000Inhabitants).toBeGreaterThan(0);

    const operationsResponse = await agent
      .get('/api/v1/operations/metrics-summary')
      .expect(200);
    const operationsBody =
      operationsResponse.body as unknown as OperationsMetricsResponseBody;

    expect(operationsBody.aiTriageRequestsLast24h).toBeGreaterThanOrEqual(1);
    expect(operationsBody.kartverketLookupCountLast24h).toBeGreaterThanOrEqual(
      1,
    );
    expect(operationsBody.analyticsLastRebuildAt).toEqual(expect.any(String));

    const auditActions = await prisma.auditEvent.findMany({
      where: {
        tenantId: tenant.id,
        entityId: { in: [publicCaseBody.caseId, aiTriageBody.id] },
      },
      select: { action: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(auditActions.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'case.created_by_citizen',
        'ai.triage_result_created',
        'case.internal_note_created',
        'case.status_updated',
      ]),
    );
    await expect(
      prisma.auditEvent.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          action: 'document.uploaded_by_citizen',
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.auditEvent.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          action: 'document.uploaded',
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.auditEvent.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          action: 'document.downloaded',
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.auditEvent.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          action: 'integration.kartverket.address_validated',
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.auditEvent.findFirstOrThrow({
        where: {
          tenantId: tenant.id,
          action: 'ai.triage_review_created',
        },
      }),
    ).resolves.toBeTruthy();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    for (const tenantId of tenantsToDelete.splice(0)) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
  });
});

async function createBusinessFlowFixture(
  prisma: PrismaService,
  input: {
    tenantSlug: string;
    userEmail: string;
    password: string;
    year: number;
  },
) {
  let tenantId: string | null = null;
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: `Business Flow ${input.tenantSlug}`,
        slug: input.tenantSlug,
        primaryLanguage: 'nb',
      },
      select: { id: true, slug: true },
    });
    tenantId = tenant.id;

    const department = await prisma.department.create({
      data: {
        tenantId: tenant.id,
        name: 'Technical Department',
        slug: 'technical-department',
        description: 'Handles technical infrastructure and water issues.',
      },
      select: { id: true, slug: true },
    });

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        departmentId: department.id,
        email: input.userEmail,
        passwordHash: await hash(input.password, 10),
        name: 'E2E Case Worker',
        role: 'department_admin',
        status: 'active',
      },
    });

    await prisma.externalMunicipalityStatistic.upsert({
      where: {
        municipalityCode_statisticKey_year_sourceDataset: {
          municipalityCode: '9901',
          statisticKey: 'population_total',
          year: input.year,
          sourceDataset: '07459',
        },
      },
      create: {
        municipalityCode: '9901',
        municipalityName: 'E2Evik',
        statisticKey: 'population_total',
        statisticLabel: 'Population total',
        year: input.year,
        value: 45_000,
        unit: 'persons',
        source: 'ssb',
        sourceDataset: '07459',
        importedAt: new Date(),
      },
      update: {
        municipalityName: 'E2Evik',
        value: 45_000,
        unit: 'persons',
        source: 'ssb',
        importedAt: new Date(),
      },
    });

    return { tenant, department };
  } catch (error) {
    if (tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    throw error;
  }
}
