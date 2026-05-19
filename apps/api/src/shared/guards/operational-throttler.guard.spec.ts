import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { OperationalThrottlerGuard } from './operational-throttler.guard';

class TestOperationalThrottlerGuard extends OperationalThrottlerGuard {
  trigger(context: ExecutionContext) {
    return this.throwThrottlingException(context, {
      limit: 10,
      ttl: 60_000,
      totalHits: 11,
      timeToExpire: 30_000,
      isBlocked: true,
      timeToBlockExpire: 60_000,
      key: 'test-key',
      tracker: '127.0.0.1',
    });
  }
}

describe('OperationalThrottlerGuard', () => {
  it.each([
    ['/api/v1/public/tenants/arendal/cases', 'public.rate_limited', 'public'],
    ['/api/v1/auth/login', 'security.rate_limited', 'auth'],
    ['/api/v1/cases', 'security.rate_limited', 'internal'],
  ])(
    'records throttling metadata for %s',
    async (path, eventType, routeSurface) => {
      const record = jest.fn().mockResolvedValue(undefined);
      const guard = new TestOperationalThrottlerGuard(
        { throttlers: [{ ttl: 60_000, limit: 10 }] },
        {} as never,
        new Reflector(),
        { record } as never,
      );
      const context = createContext({
        path,
        method: 'POST',
        requestId: 'req_rate-123',
        user: { id: 'user_1', tenantId: 'tenant_1' },
      });

      await expect(guard.trigger(context)).rejects.toBeInstanceOf(
        ThrottlerException,
      );
      expect(record).toHaveBeenCalledWith({
        eventType,
        severity: 'warning',
        source: 'throttler',
        tenantId: 'tenant_1',
        userId: 'user_1',
        requestId: 'req_rate-123',
        safeMessage: 'Request rate limit exceeded.',
        metadata: {
          limit: 10,
          method: 'POST',
          path,
          routeSurface,
          timeToBlockExpire: 60_000,
          totalHits: 11,
        },
      });
    },
  );
});

function createContext(input: {
  path: string;
  method: string;
  requestId: string;
  user: { id: string; tenantId: string };
}) {
  return {
    switchToHttp: () => ({
      getRequest: () => input,
    }),
  } as unknown as ExecutionContext;
}
