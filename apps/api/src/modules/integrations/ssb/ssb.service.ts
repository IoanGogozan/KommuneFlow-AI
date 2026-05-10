import { BadGatewayException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { appLogger } from '../../../shared/logging/app-logger';
import { OperationalEventService } from '../../operations/operational-event.service';
import { ImportMunicipalityPopulationInput } from './ssb.schemas';
import {
  ImportMunicipalityPopulationResult,
  JsonStat2Dataset,
  MunicipalityPopulationStatistic,
} from './ssb.types';

const SSB_SOURCE = 'ssb';
const POPULATION_DATASET = '07459';
const POPULATION_STATISTIC_KEY = 'population_total';
const POPULATION_STATISTIC_LABEL = 'Population total';
const POPULATION_CONTENT_CODE = 'Personer1';
const DEFAULT_TIMEOUT_MS = 5_000;

@Injectable()
export class SsbService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  async importMunicipalityPopulation(
    input: ImportMunicipalityPopulationInput,
  ): Promise<ImportMunicipalityPopulationResult> {
    const municipalityCodes = uniqueSorted(input.municipalityCodes);
    const importRun = await this.prisma.externalDataImportRun.create({
      data: {
        source: SSB_SOURCE,
        dataset: POPULATION_DATASET,
        status: 'started',
        metadataJson: {
          year: input.year,
          municipalityCount: municipalityCodes.length,
        },
      },
      select: { id: true },
    });
    const startedAt = Date.now();

    try {
      const statistics = await this.fetchMunicipalityPopulation(
        municipalityCodes,
        input.year,
      );
      const importedAt = new Date();

      for (const statistic of statistics) {
        await this.prisma.externalMunicipalityStatistic.upsert({
          where: {
            municipalityCode_statisticKey_year_sourceDataset: {
              municipalityCode: statistic.municipalityCode,
              statisticKey: POPULATION_STATISTIC_KEY,
              year: statistic.year,
              sourceDataset: statistic.sourceDataset,
            },
          },
          create: {
            municipalityCode: statistic.municipalityCode,
            municipalityName: statistic.municipalityName,
            statisticKey: POPULATION_STATISTIC_KEY,
            statisticLabel: POPULATION_STATISTIC_LABEL,
            year: statistic.year,
            value: statistic.value,
            unit: statistic.unit,
            source: SSB_SOURCE,
            sourceDataset: statistic.sourceDataset,
            importedAt,
          },
          update: {
            municipalityName: statistic.municipalityName,
            value: statistic.value,
            unit: statistic.unit,
            importedAt,
          },
        });
      }

      await this.prisma.externalDataImportRun.update({
        where: { id: importRun.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          recordsImported: statistics.length,
          metadataJson: {
            year: input.year,
            municipalityCount: municipalityCodes.length,
            recordsImported: statistics.length,
          },
        },
      });
      await this.recordIntegrationEvent({
        eventType: 'population_import',
        status: 'success',
        latencyMs: Date.now() - startedAt,
        metadata: {
          year: input.year,
          municipalityCount: municipalityCodes.length,
          recordsImported: statistics.length,
        },
      });

      return {
        importRunId: importRun.id,
        source: SSB_SOURCE,
        dataset: POPULATION_DATASET,
        year: input.year,
        recordsImported: statistics.length,
      };
    } catch (error) {
      const safeMessage =
        error instanceof Error
          ? safeErrorMessage(error.message)
          : 'SSB import failed.';

      await this.prisma.externalDataImportRun.update({
        where: { id: importRun.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: safeMessage,
          metadataJson: {
            year: input.year,
            municipalityCount: municipalityCodes.length,
          },
        },
      });
      await this.recordIntegrationEvent({
        eventType: 'population_import',
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: isTimeoutError(error) ? 'timeout' : 'import_failed',
        safeMessage,
        metadata: {
          year: input.year,
          municipalityCount: municipalityCodes.length,
        },
      });
      await this.operationalEventService.record({
        eventType: 'integration.ssb.failed',
        severity: 'error',
        source: 'ssb',
        safeMessage,
        metadata: {
          year: input.year,
          municipalityCount: municipalityCodes.length,
          errorCode: isTimeoutError(error) ? 'timeout' : 'import_failed',
        },
      });

      throw new BadGatewayException('SSB population import failed.');
    }
  }

  async getLatestPopulationForMunicipalities(
    municipalityCodes: string[],
    year: number,
  ) {
    const uniqueCodes = uniqueSorted(municipalityCodes);

    if (uniqueCodes.length === 0) {
      return [];
    }

    return this.prisma.externalMunicipalityStatistic.findMany({
      where: {
        municipalityCode: { in: uniqueCodes },
        statisticKey: POPULATION_STATISTIC_KEY,
        year,
        source: SSB_SOURCE,
        sourceDataset: POPULATION_DATASET,
      },
      select: {
        municipalityCode: true,
        municipalityName: true,
        year: true,
        value: true,
        importedAt: true,
      },
    });
  }

  async getLatestImportRun() {
    return this.prisma.externalDataImportRun.findFirst({
      where: {
        source: SSB_SOURCE,
        dataset: POPULATION_DATASET,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        recordsImported: true,
        errorMessage: true,
      },
    });
  }

  private async fetchMunicipalityPopulation(
    municipalityCodes: string[],
    year: number,
  ): Promise<MunicipalityPopulationStatistic[]> {
    const response = await fetch(
      this.buildPopulationUrl(municipalityCodes, year),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KommuneFlowAI/1.0',
        },
        signal: AbortSignal.timeout(getTimeoutMs()),
      },
    );

    if (!response.ok) {
      throw new Error(`SSB returned HTTP ${response.status}.`);
    }

    return parsePopulationDataset(
      (await response.json()) as JsonStat2Dataset,
      year,
    );
  }

  private buildPopulationUrl(municipalityCodes: string[], year: number) {
    const url = new URL(`${getBaseUrl()}/tables/${POPULATION_DATASET}/data`);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('outputFormat', 'json-stat2');
    url.searchParams.set(
      'valueCodes[Region]',
      municipalityCodes.map((code) => `K-${code}`).join(','),
    );
    url.searchParams.set('valueCodes[Tid]', String(year));
    url.searchParams.set('valueCodes[ContentsCode]', POPULATION_CONTENT_CODE);
    url.searchParams.set('codelist[Region]', 'agg_KommSummer');
    url.searchParams.set('outputValues[Region]', 'aggregated');
    return url;
  }

  private async recordIntegrationEvent(input: {
    eventType: string;
    status: 'success' | 'failed';
    latencyMs?: number;
    errorCode?: string;
    safeMessage?: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    try {
      await this.prisma.integrationHealthEvent.create({
        data: {
          integrationName: 'ssb',
          eventType: input.eventType,
          status: input.status,
          latencyMs: input.latencyMs,
          errorCode: input.errorCode,
          safeMessage: input.safeMessage,
          metadataJson: input.metadata ?? {},
        },
      });
    } catch {
      appLogger.warn(
        {
          integration: 'ssb',
          event: input.eventType,
        },
        'Could not record SSB integration health event.',
      );
    }
  }
}

export function parsePopulationDataset(
  dataset: JsonStat2Dataset,
  expectedYear: number,
): MunicipalityPopulationStatistic[] {
  if (
    !Array.isArray(dataset.id) ||
    !Array.isArray(dataset.size) ||
    !Array.isArray(dataset.value) ||
    !isRecord(dataset.dimension)
  ) {
    throw new Error('Malformed SSB JSON-stat2 response.');
  }

  const regionDimension = getDimension(dataset.dimension, 'Region');
  const timeDimension = getDimension(dataset.dimension, 'Tid');
  const contentDimension = getDimension(dataset.dimension, 'ContentsCode');
  const regionIndex = getCategoryIndex(regionDimension);
  const regionLabels = getCategoryLabels(regionDimension);
  const timeLabels = getCategoryLabels(timeDimension);
  const contentUnits = getContentUnits(contentDimension);
  const ids = dataset.id.map(String);
  const sizes = dataset.size.map((item) => Number(item));
  const values = dataset.value as unknown[];
  const regionPosition = ids.indexOf('Region');
  const timePosition = ids.indexOf('Tid');
  const contentPosition = ids.indexOf('ContentsCode');

  if (regionPosition === -1 || timePosition === -1 || contentPosition === -1) {
    throw new Error('Malformed SSB dimensions.');
  }

  const sourceDataset = getSourceDataset(dataset);

  return Object.entries(regionIndex).map(([regionCode, index]) => {
    const flatIndex = getFlatIndex(
      {
        [regionPosition]: index,
        [contentPosition]: 0,
        [timePosition]: 0,
      },
      sizes,
    );
    const value = values[flatIndex];

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error('Malformed SSB population value.');
    }

    return {
      municipalityCode: regionCode.replace(/^K-/, ''),
      municipalityName: regionLabels[regionCode] ?? null,
      year: Number(Object.keys(timeLabels)[0] ?? expectedYear),
      value,
      unit: contentUnits[POPULATION_CONTENT_CODE]?.base ?? 'number',
      sourceDataset,
      importedAt: new Date(),
    };
  });
}

function getDimension(dimensions: Record<string, unknown>, key: string) {
  const dimension = dimensions[key];

  if (!isRecord(dimension)) {
    throw new Error('Malformed SSB dimension.');
  }

  return dimension;
}

function getCategoryIndex(dimension: Record<string, unknown>) {
  const category = dimension.category;

  if (!isRecord(category) || !isRecord(category.index)) {
    throw new Error('Malformed SSB category index.');
  }

  return Object.entries(category.index).reduce<Record<string, number>>(
    (result, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = value;
      }

      return result;
    },
    {},
  );
}

function getCategoryLabels(dimension: Record<string, unknown>) {
  const category = dimension.category;

  if (!isRecord(category) || !isRecord(category.label)) {
    return {};
  }

  return Object.entries(category.label).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (typeof value === 'string') {
        result[key] = value;
      }

      return result;
    },
    {},
  );
}

function getContentUnits(dimension: Record<string, unknown>) {
  const category = dimension.category;

  if (!isRecord(category) || !isRecord(category.unit)) {
    return {};
  }

  return category.unit as Record<string, { base?: string }>;
}

function getFlatIndex(indices: Record<number, number>, sizes: number[]) {
  let multiplier = 1;
  let flatIndex = 0;

  for (let position = sizes.length - 1; position >= 0; position -= 1) {
    flatIndex += (indices[position] ?? 0) * multiplier;
    multiplier *= sizes[position];
  }

  return flatIndex;
}

function getSourceDataset(dataset: JsonStat2Dataset) {
  if (isRecord(dataset.extension) && isRecord(dataset.extension.px)) {
    const tableId = dataset.extension.px.tableid;
    return typeof tableId === 'string' ? tableId : POPULATION_DATASET;
  }

  return POPULATION_DATASET;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function getBaseUrl() {
  return process.env.SSB_API_BASE_URL ?? 'https://data.ssb.no/api/pxwebapi/v2';
}

function getTimeoutMs() {
  const parsed = Number(process.env.SSB_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function safeErrorMessage(message: string) {
  return message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 240);
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
