import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoutingRulesController } from './routing-rules.controller';
import { RoutingRulesService } from './routing-rules.service';

@Module({
  imports: [AuthModule],
  controllers: [RoutingRulesController],
  providers: [RoutingRulesService],
})
export class RoutingRulesModule {}
