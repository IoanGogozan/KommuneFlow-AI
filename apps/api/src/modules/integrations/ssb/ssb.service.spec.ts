import { BadGatewayException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SsbService, parsePopulationDataset } from './ssb.service';

describe('SsbService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('imports municipality population and stores it idempotently', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(populationDataset()),
    });
    const upsertMock = jest.fn().mockResolvedValue({});
    const importRunUpdateMock = jest
      .fn<Promise<Record<string, never>>, [ImportRunUpdateInput]>()
      .mockResolvedValue({});
    const service = createService({
      externalDataImportRun: {
        create: jest.fn().mockResolvedValue({ id: 'import_1' }),
        update: importRunUpdateMock,
      },
      externalMunicipalityStatistic: {
        upsert: upsertMock,
      },
      integrationHealthEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event_1' }),
      },
    });

    await expect(
      service.importMunicipalityPopulation({
        year: 2025,
        municipalityCodes: ['4203'],
      }),
    ).resolves.toEqual({
      importRunId: 'import_1',
      source: 'ssb',
      dataset: '07459',
      year: 2025,
      recordsImported: 1,
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          municipalityCode_statisticKey_year_sourceDataset: {
            municipalityCode: '4203',
            statisticKey: 'population_total',
            year: 2025,
            sourceDataset: '07459',
          },
        },
      }),
    );
    expect(importRunUpdateMock).toHaveBeenCalledTimes(1);
    const importRunUpdateInput = importRunUpdateMock.mock.calls[0][0];
    expect(importRunUpdateInput.data.status).toBe('completed');
    expect(importRunUpdateInput.data.recordsImported).toBe(1);
  });

  it('creates failed import run when SSB returns an upstream error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const importRunUpdateMock = jest
      .fn<Promise<Record<string, never>>, [ImportRunUpdateInput]>()
      .mockResolvedValue({});
    const service = createService({
      externalDataImportRun: {
        create: jest.fn().mockResolvedValue({ id: 'import_1' }),
        update: importRunUpdateMock,
      },
      integrationHealthEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event_1' }),
      },
    });

    await expect(
      service.importMunicipalityPopulation({
        year: 2025,
        municipalityCodes: ['4203'],
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(importRunUpdateMock).toHaveBeenCalledTimes(1);
    const importRunUpdateInput = importRunUpdateMock.mock.calls[0][0];
    expect(importRunUpdateInput.data.status).toBe('failed');
    expect(importRunUpdateInput.data.errorMessage).toBe(
      'SSB returned HTTP 500.',
    );
  });

  it('handles malformed SSB response safely', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ unexpected: [] }),
    });
    const service = createService({
      externalDataImportRun: {
        create: jest.fn().mockResolvedValue({ id: 'import_1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      integrationHealthEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event_1' }),
      },
    });

    await expect(
      service.importMunicipalityPopulation({
        year: 2025,
        municipalityCodes: ['4203'],
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('parses JSON-stat2 municipality population values', () => {
    expect(parsePopulationDataset(populationDataset(), 2025)).toMatchObject([
      {
        municipalityCode: '4203',
        municipalityName: 'Arendal',
        year: 2025,
        value: 46568,
        unit: 'number',
        sourceDataset: '07459',
      },
    ]);
  });
});

function createService(prismaShape: Record<string, unknown>) {
  return new SsbService(
    prismaShape as unknown as PrismaService,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}

function populationDataset() {
  return {
    version: '2.0',
    class: 'dataset',
    label: '07459: Population, by region and year',
    id: ['Region', 'ContentsCode', 'Tid'],
    size: [1, 1, 1],
    dimension: {
      Region: {
        category: {
          index: {
            'K-4203': 0,
          },
          label: {
            'K-4203': 'Arendal',
          },
        },
      },
      ContentsCode: {
        category: {
          index: {
            Personer1: 0,
          },
          unit: {
            Personer1: {
              base: 'number',
            },
          },
        },
      },
      Tid: {
        category: {
          index: {
            '2025': 0,
          },
          label: {
            '2025': '2025',
          },
        },
      },
    },
    extension: {
      px: {
        tableid: '07459',
      },
    },
    value: [46568],
  };
}

type ImportRunUpdateInput = {
  data: {
    status: string;
    recordsImported?: number;
    errorMessage?: string | null;
  };
};
