import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.schemas';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS } from './auth.constants';
import { RequestWithId } from '../../shared/middleware/request-id.middleware';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: unknown,
    @Req() request: Request & RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(loginSchema.parse(body), {
        requestId: request.requestId,
      });

      response.cookie(AUTH_COOKIE_NAME, result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
        path: '/api/v1',
      });

      return {
        user: result.user,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid login payload.');
      }

      throw error;
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1',
    });

    return { ok: true };
  }
}
