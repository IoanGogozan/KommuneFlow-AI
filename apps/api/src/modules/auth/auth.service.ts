import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OperationalEventService } from '../operations/operational-event.service';
import { LoginInput } from './auth.schemas';
import { CurrentUser, parseCurrentUserPayload } from './current-user';
import { ROLE_PERMISSIONS } from './permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  async login(input: LoginInput, context?: { requestId?: string }) {
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
      await this.recordFailedLogin(input.email, 'unknown_or_disabled_user', {
        requestId: context?.requestId,
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      await this.recordFailedLogin(input.email, 'invalid_password', {
        tenantId: user.tenantId,
        userId: user.id,
        requestId: context?.requestId,
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

    await this.recordSuccessfulLogin(currentUser, {
      requestId: context?.requestId,
    });

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

  async logout(
    accessToken: string | undefined,
    context?: { requestId?: string },
  ) {
    if (!accessToken) {
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(accessToken);
      const currentUser = parseCurrentUserPayload(payload);

      if (!currentUser) {
        return;
      }

      await this.operationalEventService.record({
        eventType: 'auth.logout',
        severity: 'info',
        source: 'auth',
        tenantId: currentUser.tenantId,
        userId: currentUser.id,
        requestId: context?.requestId,
        safeMessage: 'User logged out.',
        metadata: {
          role: currentUser.role,
        },
      });
    } catch {
      return;
    }
  }

  async getCurrentUserProfile(currentUser: CurrentUser) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: currentUser.id,
        status: UserStatus.active,
      },
      select: {
        id: true,
        tenantId: true,
        departmentId: true,
        email: true,
        name: true,
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      departmentId: user.departmentId,
      department: user.department,
      permissions: ROLE_PERMISSIONS[user.role],
    };
  }

  private async recordFailedLogin(
    email: string,
    reason: string,
    context?: { tenantId?: string; userId?: string; requestId?: string },
  ) {
    await this.operationalEventService.record({
      eventType: 'auth.login_failed',
      severity: 'warning',
      source: 'auth',
      tenantId: context?.tenantId,
      userId: context?.userId,
      requestId: context?.requestId,
      safeMessage: 'Login failed.',
      metadata: {
        reason,
        emailDomain: email.includes('@') ? email.split('@').at(-1) : null,
      },
    });
  }

  private async recordSuccessfulLogin(
    user: CurrentUser,
    context?: { requestId?: string },
  ) {
    await this.operationalEventService.record({
      eventType: 'auth.login_success',
      severity: 'info',
      source: 'auth',
      tenantId: user.tenantId,
      userId: user.id,
      requestId: context?.requestId,
      safeMessage: 'User logged in.',
      metadata: {
        role: user.role,
        emailDomain: user.email.includes('@')
          ? user.email.split('@').at(-1)
          : null,
      },
    });
  }
}
