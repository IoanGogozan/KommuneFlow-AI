import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SsbController } from './ssb.controller';
import { SsbService } from './ssb.service';

@Module({
  imports: [AuthModule],
  controllers: [SsbController],
  providers: [SsbService],
  exports: [SsbService],
})
export class SsbModule {}
