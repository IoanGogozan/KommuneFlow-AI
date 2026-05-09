import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  KartverketAddressController,
  PublicKartverketAddressController,
} from './kartverket-address.controller';
import { KartverketAddressService } from './kartverket-address.service';

describe('KartverketAddressController', () => {
  it('passes validated internal search query to the service', async () => {
    const searchMock = jest
      .fn()
      .mockResolvedValue({ query: 'Storgata', results: [] });
    const controller = new KartverketAddressController({
      search: searchMock,
    } as unknown as KartverketAddressService);
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'admin@example.local',
      role: UserRole.super_admin,
    };

    await expect(controller.search({ q: 'Storgata' }, user)).resolves.toEqual({
      query: 'Storgata',
      results: [],
    });
    expect(searchMock).toHaveBeenCalledWith('Storgata', { user });
  });

  it('rejects invalid internal search query', async () => {
    const controller = new KartverketAddressController({
      search: jest.fn(),
    } as unknown as KartverketAddressService);

    await expect(
      controller.search({ q: 'ab' }, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PublicKartverketAddressController', () => {
  it('passes public tenant context to the service', async () => {
    const searchMock = jest
      .fn()
      .mockResolvedValue({ query: 'Storgata', results: [] });
    const controller = new PublicKartverketAddressController({
      search: searchMock,
    } as unknown as KartverketAddressService);

    await controller.search('arendal', { q: 'Storgata' });

    expect(searchMock).toHaveBeenCalledWith('Storgata', {
      publicTenantSlug: 'arendal',
    });
  });
});
