import { NextFunction, Response } from 'express';
import { appLogger } from '../logging/app-logger';
import { RequestWithId } from './request-id.middleware';

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
      path: request.originalUrl ?? request.url,
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
