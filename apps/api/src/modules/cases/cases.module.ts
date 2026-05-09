import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KartverketAddressModule } from '../integrations/kartverket-address/kartverket-address.module';
import { CasesController, PublicCasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [AuditModule, AuthModule, KartverketAddressModule],
  controllers: [CasesController, PublicCasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
