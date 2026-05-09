import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('returns 401 when no bearer token is provided', async () => {
    const guard = new AuthGuard({} as JwtService);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the decoded user when a bearer token is valid', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        id: 'user_1',
        tenantId: 'tenant_1',
        departmentId: 'department_1',
        email: 'case.worker@arendal.local',
        role: 'case_worker',
      }),
    } as unknown as JwtService;
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const guard = new AuthGuard(jwtService);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user');
  });
});

function createContext(
  request: Record<string, unknown> = { headers: {} },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
