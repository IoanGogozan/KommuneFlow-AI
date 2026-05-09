import { Body, Controller, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.schemas';
import { BadRequestException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown) {
    try {
      return await this.authService.login(loginSchema.parse(body));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid login payload.');
      }

      throw error;
    }
  }
}
