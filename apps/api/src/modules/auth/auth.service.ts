import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OperationalEventService } from '../operations/operational-event.service';
import { LoginInput } from './auth.schemas';
import { CurrentUser } from './current-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: {
        id: true,
        tenantId: true,
        departmentId: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.active) {
      await this.recordFailedLogin(input.email, 'unknown_or_disabled_user');
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      await this.recordFailedLogin(input.email, 'invalid_password', {
        tenantId: user.tenantId,
        userId: user.id,
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    const currentUser: CurrentUser = {
      id: user.id,
      tenantId: user.tenantId,
      departmentId: user.departmentId,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(currentUser);

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        departmentId: user.departmentId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private async recordFailedLogin(
    email: string,
    reason: string,
    context?: { tenantId?: string; userId?: string },
  ) {
    await this.operationalEventService.record({
      eventType: 'auth.login_failed',
      severity: 'warning',
      source: 'auth',
      tenantId: context?.tenantId,
      userId: context?.userId,
      safeMessage: 'Login failed.',
      metadata: {
        reason,
        emailDomain: email.includes('@') ? email.split('@').at(-1) : null,
      },
    });
  }
}
