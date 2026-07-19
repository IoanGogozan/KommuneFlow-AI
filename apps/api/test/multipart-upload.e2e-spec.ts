import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import {
  AuthGuard,
  AuthenticatedRequest,
} from '../src/modules/auth/auth.guard';
import { PermissionsGuard } from '../src/modules/auth/permissions.guard';
import { PublicCasesController } from '../src/modules/cases/cases.controller';
import { CasesService } from '../src/modules/cases/cases.service';
import { DocumentsController } from '../src/modules/documents/documents.controller';
import {
  DocumentsService,
  validateDocumentFile,
} from '../src/modules/documents/documents.service';
import { OperationalEventService } from '../src/modules/operations/operational-event.service';
import { AllExceptionsFilter } from '../src/shared/filters/all-exceptions.filter';

describe('multipart upload limits (e2e)', () => {
  let app: INestApplication<App>;
  let uploadRoot: string;
  const createPublicCase = jest.fn();
  const uploadForCase = jest.fn(
    (_caseId, _user, file: Express.Multer.File | undefined) => {
      if (file) validateDocumentFile(file);
      return { id: 'doc_safe' };
    },
  );

  beforeAll(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'kommuneflow-upload-e2e-'));
    process.env.UPLOAD_STORAGE_PATH = uploadRoot;
    const module = await Test.createTestingModule({
      controllers: [PublicCasesController, DocumentsController],
      providers: [
        { provide: CasesService, useValue: { createPublicCase } },
        { provide: DocumentsService, useValue: { uploadForCase } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<AuthenticatedRequest>().user = {
            id: 'user_1',
            tenantId: 'tenant_1',
            departmentId: 'dept_1',
            email: 'synthetic@example.test',
            role: 'department_admin',
          };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    app.useGlobalFilters(
      new AllExceptionsFilter({
        record: jest.fn(),
      } as unknown as OperationalEventService),
    );
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it.each([
    [
      'too many fields',
      (call: SupertestRequest) =>
        call.field('extra', '1').field('payload', '{}'),
    ],
    [
      'too many parts',
      (call: SupertestRequest) => {
        let result = call.field('payload', '{}');
        for (let index = 0; index < 6; index += 1) {
          result = result.attach(
            'documents',
            Buffer.from('%PDF'),
            `f${index}.pdf`,
          );
        }
        return result;
      },
    ],
    [
      'excessively long nested field name',
      (call: SupertestRequest) => call.field(`a[${'x'.repeat(120)}]`, '1'),
    ],
  ])('rejects %s without persistence', async (_name, build) => {
    const call = request(app.getHttpServer()).post(
      '/api/v1/public/tenants/demo/cases',
    );
    const response = await build(call);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(typeof errorBody(response).error.code).toBe('string');
    expect(typeof errorBody(response).error.requestId).toBe('string');
    expect(createPublicCase).not.toHaveBeenCalled();
    expect(await readdir(uploadRoot)).toEqual([]);
  });

  it('rejects an oversized file and multiple files on the single-file endpoint', async () => {
    const oversized = await request(app.getHttpServer())
      .post('/api/v1/cases/case_1/documents')
      .field('isSensitive', 'false')
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), 'large.pdf');
    expect(oversized.status).toBe(413);
    expect(errorBody(oversized).error.requestId).toEqual(expect.any(String));

    const multiple = await request(app.getHttpServer())
      .post('/api/v1/cases/case_1/documents')
      .attach('file', Buffer.from('%PDF'), 'one.pdf')
      .attach('file', Buffer.from('%PDF'), 'two.pdf');
    expect(multiple.status).toBeGreaterThanOrEqual(400);
    expect(multiple.status).toBeLessThan(500);
    expect(uploadForCase).not.toHaveBeenCalled();
    expect(await readdir(uploadRoot)).toEqual([]);
  });

  it.each([
    ['invalid MIME', Buffer.from('plain text'), 'bad.txt', 'text/plain'],
    [
      'extension/MIME mismatch',
      Buffer.from('%PDF'),
      'bad.png',
      'application/pdf',
    ],
    [
      'invalid magic bytes',
      Buffer.from('not a pdf'),
      'bad.pdf',
      'application/pdf',
    ],
  ])(
    'rejects %s with a safe response',
    async (_name, content, filename, contentType) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cases/case_1/documents')
        .field('isSensitive', 'false')
        .attach('file', content, { filename, contentType });
      expect(response.status).toBe(400);
      expect(errorBody(response).error.code).toBe('BAD_REQUEST');
      expect(typeof errorBody(response).error.requestId).toBe('string');
      expect(await readdir(uploadRoot)).toEqual([]);
    },
  );

  it('allows a valid PDF upload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/cases/case_1/documents')
      .field('isSensitive', 'false')
      .attach('file', Buffer.from('%PDF-1.4\n%EOF'), {
        filename: 'safe.pdf',
        contentType: 'application/pdf',
      });
    expect({ status: response.status, body: response.body as unknown }).toEqual(
      {
        status: 201,
        body: { id: 'doc_safe' },
      },
    );
    expect(uploadForCase).toHaveBeenCalledTimes(1);
  });
});

type ErrorBody = {
  error: { code: string; requestId: string; message?: string; path?: string };
};

function errorBody(response: { body: unknown }): ErrorBody {
  return response.body as ErrorBody;
}

type SupertestRequest = request.Test;
