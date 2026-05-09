import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
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
      (check) => check.status === 'ok',
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
}
