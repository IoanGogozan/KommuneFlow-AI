import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  REQUEST_ID_HEADER,
  RequestWithId,
} from '../middleware/request-id.middleware';
import { appLogger } from '../logging/app-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & RequestWithId>();
    const requestId = request.requestId ?? randomUUID();
    const status = getStatus(exception);
    const errorCode = statusToCode(status);
    const safeMessage = getErrorMessage(exception);

    if (!response.headersSent) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

    logException({
      exception,
      request,
      requestId,
      status,
      errorCode,
      safeMessage,
    });

    response.status(status).json({
      error: {
        code: errorCode,
        message: safeMessage,
        requestId,
        path: request.url,
      },
    });
  }
}

type ExceptionLogInput = {
  exception: unknown;
  request: Request & RequestWithId;
  requestId: string;
  status: number;
  errorCode: string;
  safeMessage: string;
};

function logException(input: ExceptionLogInput) {
  const logPayload = {
    event: 'http_error',
    requestId: input.requestId,
    errorCode: input.errorCode,
    safeMessage: input.safeMessage,
    method: input.request.method,
    path: input.request.originalUrl ?? input.request.url,
    statusCode: input.status,
    userId: input.request.user?.id,
    tenantId: input.request.user?.tenantId,
    stack: shouldLogStack(input.exception) ? input.exception.stack : undefined,
  };

  if (input.status >= 500) {
    appLogger.error(logPayload);
    return;
  }

  appLogger.warn(logPayload);
}

function getErrorMessage(exception: unknown) {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return exception.message;
  }

  return 'Internal server error.';
}

function getStatus(exception: unknown) {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (
    typeof exception === 'object' &&
    exception !== null &&
    'statusCode' in exception &&
    typeof exception.statusCode === 'number'
  ) {
    return exception.statusCode;
  }

  if (
    typeof exception === 'object' &&
    exception !== null &&
    'status' in exception &&
    typeof exception.status === 'number'
  ) {
    return exception.status;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function shouldLogStack(exception: unknown): exception is Error {
  return process.env.NODE_ENV === 'development' && exception instanceof Error;
}

function statusToCode(status: number) {
  const codes: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
    [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  };

  return codes[status] ?? 'INTERNAL_SERVER_ERROR';
}
