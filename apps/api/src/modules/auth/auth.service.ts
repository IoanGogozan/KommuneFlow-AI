import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginInput } from './auth.schemas';
import { CurrentUser } from './current-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
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
}
