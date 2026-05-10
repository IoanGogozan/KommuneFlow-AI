import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { OperationalEventService } from '../../operations/operational-event.service';
import { KartverketAddressService } from './kartverket-address.service';

describe('KartverketAddressService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('normalizes successful address search results', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        adresser: [
          {
            adressetekst: 'Storgata 12',
            adressekode: '1001',
            nummer: 12,
            kommunenummer: '4203',
            kommunenavn: 'Arendal',
            postnummer: '4836',
            representasjonspunkt: {
              lat: 58.461,
              lon: 8.772,
            },
            extraRawField: 'not exposed',
          },
        ],
      }),
    });
    const service = createService();

    await expect(service.search(' Storgata 12 ')).resolves.toEqual({
      query: 'Storgata 12',
      results: [
        {
          sourceReferenceId: '4203-1001-12',
          normalizedAddress: 'Storgata 12, 4836, Arendal',
          municipalityCode: '4203',
          municipalityName: 'Arendal',
          postalCode: '4836',
          latitude: 58.461,
          longitude: 8.772,
        },
      ],
    });
  });

  it('rejects empty address search query', async () => {
    const service = createService();

    await expect(service.search('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects too short address search query', async () => {
    const service = createService();

    await expect(service.search('ab')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('handles Kartverket timeout safely', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest.fn().mockRejectedValue(
      Object.assign(new Error('Timeout'), {
        name: 'TimeoutError',
      }),
    );
    const service = createService({
      operationalEventService: {
        record: operationalRecordMock,
      } as unknown as OperationalEventService,
    });

    await expect(service.search('Storgata 12')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integration.kartverket.failed',
        severity: 'error',
        source: 'kartverket_address',
        safeMessage: 'Kartverket address search timed out.',
        metadata: {
          queryLength: 11,
          errorCode: 'timeout',
        },
      }),
    );
    expect(JSON.stringify(operationalRecordMock.mock.calls)).not.toContain(
      'Storgata 12',
    );
  });

  it('handles Kartverket 500 safely', async () => {
    const integrationHealthCreateMock = jest
      .fn<Promise<{ id: string }>, [IntegrationHealthCreateInput]>()
      .mockResolvedValue({ id: 'event_1' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const service = createService({
      prismaShape: {
        integrationHealthEvent: {
          create: integrationHealthCreateMock,
        },
      },
    });

    await expect(service.search('Storgata 12')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    const integrationHealthCreateInput =
      integrationHealthCreateMock.mock.calls[0][0];
    expect(integrationHealthCreateInput.data).toMatchObject({
      integrationName: 'kartverket_address',
      eventType: 'address_search',
      status: 'failed',
      errorCode: 'http_500',
      safeMessage: 'Kartverket address search returned an upstream error.',
    });
  });

  it('handles malformed Kartverket response safely', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ unexpected: [] }),
    });
    const service = createService();

    await expect(service.search('Storgata 12')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

function createService(input?: {
  prismaShape?: Record<string, unknown>;
  operationalEventService?: OperationalEventService;
}) {
  return new KartverketAddressService(
    (input?.prismaShape ?? {
      integrationHealthEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event_1' }),
      },
    }) as unknown as PrismaService,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService,
    input?.operationalEventService ??
      ({
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as OperationalEventService),
  );
}

type IntegrationHealthCreateInput = {
  data: {
    integrationName: string;
    eventType: string;
    status: string;
    errorCode?: string;
    safeMessage?: string;
  };
};
