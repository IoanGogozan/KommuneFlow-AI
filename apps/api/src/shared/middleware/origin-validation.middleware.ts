import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE_NAME } from '../../modules/auth/auth.constants';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    if (!shouldValidateOrigin(request)) {
      next();
      return;
    }

    const allowedOrigins = getAllowedOrigins();
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    if (
      (origin && allowedOrigins.has(origin)) ||
      (!origin && referer && isAllowedReferer(referer, allowedOrigins))
    ) {
      next();
      return;
    }

    throw new ForbiddenException('Invalid request origin.');
  }
}

export function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.APP_BASE_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins);
  }

  return new Set(['http://localhost:3000']);
}

function shouldValidateOrigin(request: Request) {
  if (!unsafeMethods.has(request.method)) {
    return false;
  }

  const cookies = request.cookies as Record<string, unknown> | undefined;
  return typeof cookies?.[AUTH_COOKIE_NAME] === 'string';
}

function isAllowedReferer(referer: string, allowedOrigins: Set<string>) {
  try {
    const refererUrl = new URL(referer);
    return allowedOrigins.has(refererUrl.origin);
  } catch {
    return false;
  }
}
