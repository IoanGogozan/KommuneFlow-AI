import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthGuard } from '../../auth/auth.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { importMunicipalityPopulationSchema } from './ssb.schemas';
import { SsbService } from './ssb.service';

@Controller('integrations/ssb')
@UseGuards(AuthGuard, PermissionsGuard)
export class SsbController {
  constructor(private readonly ssbService: SsbService) {}

  @Post('imports/municipality-population')
  @RequirePermissions('tenant:manage')
  async importMunicipalityPopulation(@Body() body: unknown) {
    try {
      return await this.ssbService.importMunicipalityPopulation(
        importMunicipalityPopulationSchema.parse(body),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Invalid SSB import payload.');
      }

      throw error;
    }
  }
}
