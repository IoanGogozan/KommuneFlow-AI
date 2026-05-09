import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { AuthModule } from '../../auth/auth.module';
import {
  KartverketAddressController,
  PublicKartverketAddressController,
} from './kartverket-address.controller';
import { KartverketAddressService } from './kartverket-address.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [KartverketAddressController, PublicKartverketAddressController],
  providers: [KartverketAddressService],
  exports: [KartverketAddressService],
})
export class KartverketAddressModule {}
