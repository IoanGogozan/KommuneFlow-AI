import type { Response } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants';

const authCookieBaseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/api/v1',
};

export function setAuthCookie(
  response: Response,
  accessToken: string,
  ttlSeconds: number,
) {
  response.cookie(AUTH_COOKIE_NAME, accessToken, {
    ...authCookieBaseOptions,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ttlSeconds * 1000,
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(AUTH_COOKIE_NAME, {
    ...authCookieBaseOptions,
    secure: process.env.NODE_ENV === 'production',
  });
}
