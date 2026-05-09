import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AIModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CasesModule } from './modules/cases/cases.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { KartverketAddressModule } from './modules/integrations/kartverket-address/kartverket-address.module';
import { SsbModule } from './modules/integrations/ssb/ssb.module';
import { OperationsModule } from './modules/operations/operations.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    AuthModule,
    CasesModule,
    DocumentsModule,
    KartverketAddressModule,
    SsbModule,
    AIModule,
    AnalyticsModule,
    OperationsModule,
    PrivacyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
