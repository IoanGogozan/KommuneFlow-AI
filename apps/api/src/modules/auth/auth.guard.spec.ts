import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('returns 401 when no token is provided', async () => {
    const guard = new AuthGuard({} as JwtService);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the decoded user when a bearer token is valid', async () => {
    const verifyAsyncMock = jest.fn().mockResolvedValue(currentUserPayload());
    const jwtService = {
      verifyAsync: verifyAsyncMock,
    } as unknown as JwtService;
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const guard = new AuthGuard(jwtService);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(verifyAsyncMock).toHaveBeenCalledWith('valid-token');
    expect(request).toHaveProperty('user');
  });

  it('attaches the decoded user when an HttpOnly cookie token is valid', async () => {
    const verifyAsyncMock = jest.fn().mockResolvedValue(currentUserPayload());
    const jwtService = {
      verifyAsync: verifyAsyncMock,
    } as unknown as JwtService;
    const request = {
      headers: {},
      cookies: {
        [AUTH_COOKIE_NAME]: 'cookie-token',
      },
    };
    const guard = new AuthGuard(jwtService);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(verifyAsyncMock).toHaveBeenCalledWith('cookie-token');
    expect(request).toHaveProperty('user');
  });
});

function currentUserPayload() {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: 'department_1',
    email: 'case.worker@arendal.local',
    role: 'case_worker',
  };
}

function createContext(
  request: Record<string, unknown> = { headers: {} },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
