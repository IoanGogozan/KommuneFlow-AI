import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { CurrentUser, parseCurrentUserPayload } from './current-user';

export type AuthenticatedRequest = Request & {
  user?: CurrentUser;
  cookies?: Record<string, unknown>;
  requestId?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);
      const currentUser = parseCurrentUserPayload(payload);

      if (!currentUser) {
        throw new UnauthorizedException('Authentication required.');
      }

      request.user = currentUser;
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const cookies: unknown = request.cookies;
    const cookieToken =
      typeof cookies === 'object' &&
      cookies !== null &&
      AUTH_COOKIE_NAME in cookies
        ? (cookies as Record<string, unknown>)[AUTH_COOKIE_NAME]
        : undefined;

    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
