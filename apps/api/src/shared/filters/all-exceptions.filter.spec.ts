import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { appLogger } from '../logging/app-logger';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('returns standardized safe client errors without recording operational incidents', () => {
    const record = jest.fn();
    const { host, response } = createHost({
      path: '/api/v1/public/tenants/arendal/cases?statusAccessCode=secret',
      requestId: 'req_safe-123',
    });
    const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation();

    new AllExceptionsFilter({ record } as never).catch(
      new BadRequestException(['Invalid payload', 'Missing title']),
      host,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      'req_safe-123',
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid payload, Missing title',
        requestId: 'req_safe-123',
        path: '/api/v1/public/tenants/arendal/cases',
      },
    });
    expect(record).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_error',
        errorCode: 'BAD_REQUEST',
        path: '/api/v1/public/tenants/arendal/cases',
      }),
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('secret');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('records tenant-scoped operational events for server errors without leaking stack traces outside development', async () => {
    process.env.NODE_ENV = 'test';
    const record = jest.fn().mockResolvedValue(undefined);
    const { host, response } = createHost({
      method: 'POST',
      path: '/api/v1/cases/case_1/status',
      requestId: 'req_error-123',
      user: { id: 'user_1', tenantId: 'tenant_1' },
    });
    const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation();

    new AllExceptionsFilter({ record } as never).catch(
      new InternalServerErrorException('Database is unavailable.'),
      host,
    );

    await Promise.resolve();

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database is unavailable.',
        requestId: 'req_error-123',
        path: '/api/v1/cases/case_1/status',
      },
    });
    expect(record).toHaveBeenCalledWith({
      eventType: 'api.error',
      severity: 'error',
      source: 'api',
      tenantId: 'tenant_1',
      userId: 'user_1',
      requestId: 'req_error-123',
      safeMessage: 'Database is unavailable.',
      metadata: {
        errorCode: 'INTERNAL_SERVER_ERROR',
        method: 'POST',
        path: '/api/v1/cases/case_1/status',
        statusCode: 500,
      },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: undefined,
        statusCode: 500,
      }),
    );
  });

  it('maps status-like non-Nest exceptions to safe status codes', () => {
    const { host, response } = createHost({ requestId: undefined });

    new AllExceptionsFilter({ record: jest.fn() } as never).catch(
      { statusCode: 503 },
      host,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    const body = getJsonResponseBody(response);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toBe('Internal server error.');
    expect(body.error.requestId).toEqual(expect.any(String));
  });

  it('uses HttpException message strings when no response message object exists', () => {
    const { host, response } = createHost({});

    new AllExceptionsFilter({ record: jest.fn() } as never).catch(
      new HttpException('Custom safe message', 502),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(502);
    const body = getJsonResponseBody(response);
    expect(body.error.code).toBe('BAD_GATEWAY');
    expect(body.error.message).toBe('Custom safe message');
  });
});

type ErrorJsonBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    path: string;
  };
};

function getJsonResponseBody(response: {
  json: jest.Mock<unknown, [unknown]>;
}) {
  return response.json.mock.calls[0]?.[0] as ErrorJsonBody;
}

function createHost(input: {
  method?: string;
  path?: string;
  requestId?: string;
  user?: { id: string; tenantId: string };
}) {
  const request = {
    method: input.method ?? 'GET',
    path: input.path ?? '/api/v1/test',
    originalUrl: input.path ?? '/api/v1/test',
    requestId: input.requestId,
    user: input.user,
  };
  const response = {
    headersSent: false,
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}
