import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OperationsController } from './operations.controller';
import { OperationalEventsModule } from './operational-events.module';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuthModule, OperationalEventsModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
