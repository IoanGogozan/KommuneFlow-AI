import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../../modules/auth/current-user';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export type RequestWithId = Request & {
  requestId?: string;
  user?: CurrentUser;
};

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const incomingRequestId = request.header(REQUEST_ID_HEADER);
  const requestId = isSafeRequestId(incomingRequestId)
    ? incomingRequestId
    : randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

function isSafeRequestId(value: string | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value)
  );
}
