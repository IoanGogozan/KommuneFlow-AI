import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { OriginValidationMiddleware } from './origin-validation.middleware';

describe('OriginValidationMiddleware auth session protection', () => {
  const middleware = new OriginValidationMiddleware();

  it.each([
    '/api/v1/auth/login',
    '/api/v1/auth/demo-session',
    '/api/v1/auth/logout',
  ])('requires an allowed browser origin for %s', (path) => {
    expect(() =>
      runMiddleware(middleware, {
        method: 'POST',
        path,
        headers: {},
      }),
    ).toThrow(ForbiddenException);
  });

  it('accepts an allowed Origin header', () => {
    const next = runMiddleware(middleware, {
      method: 'POST',
      path: '/api/v1/auth/demo-session',
      headers: { origin: 'http://localhost:3000' },
    });

    expect(next).toHaveBeenCalled();
  });

  it('accepts an allowed Referer fallback', () => {
    const next = runMiddleware(middleware, {
      method: 'POST',
      path: '/api/v1/auth/demo-session',
      headers: { referer: 'http://localhost:3000/demo' },
    });

    expect(next).toHaveBeenCalled();
  });
});

function runMiddleware(
  middleware: OriginValidationMiddleware,
  request: Partial<Request>,
) {
  const next = jest.fn() as NextFunction;
  middleware.use(request as Request, {} as Response, next);
  return next;
}
