import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import { AuthGuard } from '../../auth/auth.guard';
import type { CurrentUser } from '../../auth/current-user';
import { CurrentUserParam } from '../../auth/current-user.decorator';
import { KartverketAddressService } from './kartverket-address.service';
import { addressSearchQuerySchema } from './kartverket-address.schemas';

@Controller('integrations/kartverket')
@UseGuards(AuthGuard)
export class KartverketAddressController {
  constructor(
    private readonly kartverketAddressService: KartverketAddressService,
  ) {}

  @Get('address-search')
  async search(@Query() query: unknown, @CurrentUserParam() user: CurrentUser) {
    try {
      const parsed = addressSearchQuerySchema.parse(query);
      return this.kartverketAddressService.search(parsed.q, { user });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid address search query.');
      }

      throw error;
    }
  }
}

@Controller('public/tenants/:tenantSlug/integrations/kartverket')
export class PublicKartverketAddressController {
  constructor(
    private readonly kartverketAddressService: KartverketAddressService,
  ) {}

  @Get('address-search')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async search(
    @Param('tenantSlug') tenantSlug: string,
    @Query() query: unknown,
  ) {
    try {
      const parsed = addressSearchQuerySchema.parse(query);
      return this.kartverketAddressService.search(parsed.q, {
        publicTenantSlug: tenantSlug,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid address search query.');
      }

      throw error;
    }
  }
}
