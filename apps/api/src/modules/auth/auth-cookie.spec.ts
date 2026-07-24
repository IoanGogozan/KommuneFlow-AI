import type { Response } from 'express';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';
import { AUTH_COOKIE_NAME } from './auth.constants';

describe('auth cookie helpers', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('sets the guest TTL and secure production cookie attributes', () => {
    process.env.NODE_ENV = 'production';
    const cookie = jest.fn();

    setAuthCookie({ cookie } as unknown as Response, 'guest-token', 1800);

    expect(cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'guest-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1_800_000,
      path: '/api/v1',
    });
  });

  it('clears staff and guest sessions with the same cookie scope', () => {
    const clearCookie = jest.fn();

    clearAuthCookie({ clearCookie } as unknown as Response);

    expect(clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/v1',
      }),
    );
  });
});
