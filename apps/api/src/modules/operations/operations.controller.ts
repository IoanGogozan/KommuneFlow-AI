import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { OperationsService } from './operations.service';

@Controller()
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'kommuneflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async readiness() {
    const checks = await this.operationsService.getReadinessChecks();
    const isReady = Object.values(checks).every(
      (check) => check.status !== 'error',
    );

    if (!isReady) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
      });
    }

    return {
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('operations/metrics-summary')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('operations:read')
  metricsSummary() {
    return this.operationsService.getMetricsSummary();
  }
}
