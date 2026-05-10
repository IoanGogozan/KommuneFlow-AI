import { NextFunction, Response } from 'express';
import { appLogger } from '../logging/app-logger';
import { RequestWithId } from './request-id.middleware';
import { safeRequestPath } from './request-path';

export function requestLoggingMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const startTime = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    appLogger.info({
      event: 'http_request',
      requestId: request.requestId,
      method: request.method,
      path: safeRequestPath(request),
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: request.user?.id,
      tenantId: request.user?.tenantId,
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
    });
  });

  next();
}
