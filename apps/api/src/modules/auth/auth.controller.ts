import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.schemas';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS } from './auth.constants';
import { RequestWithId } from '../../shared/middleware/request-id.middleware';
import { AuthGuard } from './auth.guard';
import { CurrentUserParam } from './current-user.decorator';
import type { CurrentUser } from './current-user';

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
  async logout(
    @Req() request: Request & RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(getAuthCookie(request), {
      requestId: request.requestId,
    });

    response.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1',
    });

    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUserParam() user: CurrentUser) {
    return this.authService.getCurrentUserProfile(user);
  }
}

function getAuthCookie(request: Request) {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const cookie = cookies?.[AUTH_COOKIE_NAME];
  return typeof cookie === 'string' ? cookie : undefined;
}
