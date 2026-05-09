import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CurrentUser } from './current-user';

export type AuthenticatedRequest = Request & {
  user?: CurrentUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      request.user = await this.jwtService.verifyAsync<CurrentUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
