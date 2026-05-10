import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Request } from 'express';
import { OperationalEventService } from '../../modules/operations/operational-event.service';
import { RequestWithId } from '../middleware/request-id.middleware';

@Injectable()
export class OperationalThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly operationalEventService: OperationalEventService,
  ) {
    super(options, storageService, reflector);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithId>();
    const routeSurface = classifyRouteSurface(request);

    await this.operationalEventService.record({
      eventType:
        routeSurface === 'public'
          ? 'public.rate_limited'
          : 'security.rate_limited',
      severity: 'warning',
      source: 'throttler',
      tenantId: request.user?.tenantId,
      userId: request.user?.id,
      requestId: request.requestId,
      safeMessage: 'Request rate limit exceeded.',
      metadata: {
        limit: throttlerLimitDetail.limit,
        method: request.method,
        path: request.path,
        routeSurface,
        timeToBlockExpire: throttlerLimitDetail.timeToBlockExpire,
        totalHits: throttlerLimitDetail.totalHits,
      },
    });

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}

function classifyRouteSurface(request: Request) {
  if (request.path.startsWith('/api/v1/public/')) {
    return 'public';
  }

  if (request.path === '/api/v1/auth/login') {
    return 'auth';
  }

  return 'internal';
}
