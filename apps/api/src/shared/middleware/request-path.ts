import { Request } from 'express';

export function safeRequestPath(request: Request) {
  const rawPath = request.originalUrl ?? request.url ?? request.path ?? '/';
  return rawPath.split('?')[0] || request.path || '/';
}
