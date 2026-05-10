import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_TOKEN_TTL_SECONDS, getJwtSecret } from './auth.constants';
import { OperationalEventsModule } from '../operations/operational-events.module';

@Module({
  imports: [
    OperationalEventsModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: AUTH_TOKEN_TTL_SECONDS,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
