import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { appLogger } from '../../../shared/logging/app-logger';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CurrentUser } from '../../auth/current-user';
import { OperationalEventService } from '../../operations/operational-event.service';
import {
  AddressValidationMode,
  AddressValidationResult,
  KartverketAddressCandidate,
  KartverketAddressSearchResult,
  NormalizedAddress,
} from './kartverket-address.types';

const DEFAULT_BASE_URL = 'https://ws.geonorge.no/adresser/v1';
const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_RESULTS = 8;

@Injectable()
export class KartverketAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  async search(
    query: string,
    context?: {
      user?: CurrentUser;
      tenantId?: string;
      publicTenantSlug?: string;
    },
  ): Promise<KartverketAddressSearchResult> {
    const normalizedQuery = normalizeQuery(query);
    const startedAt = Date.now();

    appLogger.info(
      {
        integration: 'kartverket',
        event: 'address_search',
        queryLength: normalizedQuery.length,
        tenantId: context?.user?.tenantId ?? context?.tenantId,
        publicTenantSlug: context?.publicTenantSlug,
      },
      'Kartverket address search requested.',
    );

    try {
      const response = await fetch(this.buildSearchUrl(normalizedQuery), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KommuneFlowAI/1.0',
        },
        signal: AbortSignal.timeout(getTimeoutMs()),
      });
      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        await this.recordIntegrationEvent({
          eventType: 'address_search',
          status: 'failed',
          latencyMs,
          errorCode: `http_${response.status}`,
          safeMessage: 'Kartverket address search returned an upstream error.',
          metadata: { queryLength: normalizedQuery.length },
        });
        await this.recordOperationalFailure({
          tenantId: context?.user?.tenantId ?? context?.tenantId,
          eventType: 'integration.kartverket.failed',
          safeMessage: 'Kartverket address search returned an upstream error.',
          metadata: {
            queryLength: normalizedQuery.length,
            errorCode: `http_${response.status}`,
          },
        });
        throw new BadGatewayException('Address lookup is unavailable.');
      }

      const payload = (await response.json()) as unknown;
      const results = this.normalizePayload(payload);

      await this.recordIntegrationEvent({
        eventType: 'address_search',
        status: 'success',
        latencyMs,
        metadata: {
          queryLength: normalizedQuery.length,
          resultCount: results.length,
        },
      });

      if (context?.user) {
        await this.auditService.record({
          tenantId: context.user.tenantId,
          actor: context.user,
          action: 'integration.kartverket.address_search',
          entityType: 'integration',
          entityId: 'kartverket-address',
          metadata: {
            queryLength: normalizedQuery.length,
            resultCount: results.length,
          },
        });
      }

      return {
        query: normalizedQuery,
        results,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const isTimeout = isAbortError(error);
      await this.recordIntegrationEvent({
        eventType: 'address_search',
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: isTimeout ? 'timeout' : 'invalid_response',
        safeMessage: isTimeout
          ? 'Kartverket address search timed out.'
          : 'Kartverket address search failed.',
        metadata: { queryLength: normalizedQuery.length },
      });
      await this.recordOperationalFailure({
        tenantId: context?.user?.tenantId ?? context?.tenantId,
        eventType: 'integration.kartverket.failed',
        safeMessage: isTimeout
          ? 'Kartverket address search timed out.'
          : 'Kartverket address search failed.',
        metadata: {
          queryLength: normalizedQuery.length,
          errorCode: isTimeout ? 'timeout' : 'invalid_response',
        },
      });

      throw new BadGatewayException('Address lookup is unavailable.');
    }
  }

  async validateAddress(
    originalInput: string | null | undefined,
    mode: AddressValidationMode = 'best_effort',
  ): Promise<AddressValidationResult> {
    const cleaned = originalInput?.trim();

    if (!cleaned || mode === 'skip') {
      return { status: 'skipped', address: null };
    }

    if (cleaned.length < 3) {
      return mode === 'required'
        ? { status: 'not_found', address: null }
        : { status: 'skipped', address: null };
    }

    try {
      const searchResult = await this.search(cleaned);
      const firstAddress = searchResult.results[0];

      if (!firstAddress) {
        return { status: 'not_found', address: null };
      }

      return {
        status: 'validated',
        address: firstAddress,
      };
    } catch {
      if (mode === 'required') {
        throw new BadGatewayException('Address validation failed.');
      }

      return {
        status: 'failed',
        address: null,
        safeMessage: 'Address validation skipped because Kartverket failed.',
      };
    }
  }

  private buildSearchUrl(query: string) {
    const url = new URL(`${getBaseUrl()}/sok`);
    url.searchParams.set('sok', query);
    url.searchParams.set('treffPerSide', String(MAX_RESULTS));
    url.searchParams.set(
      'filtrer',
      [
        'adresser.adressetekst',
        'adresser.adressekode',
        'adresser.nummer',
        'adresser.bokstav',
        'adresser.kommunenummer',
        'adresser.kommunenavn',
        'adresser.postnummer',
        'adresser.poststed',
        'adresser.representasjonspunkt',
      ].join(','),
    );
    return url;
  }

  private normalizePayload(payload: unknown): NormalizedAddress[] {
    if (!isRecord(payload) || !Array.isArray(payload.adresser)) {
      throw new Error('Malformed Kartverket address response.');
    }

    return payload.adresser
      .map((candidate) =>
        this.normalizeCandidate(candidate as KartverketAddressCandidate),
      )
      .filter((candidate): candidate is NormalizedAddress => candidate !== null)
      .slice(0, MAX_RESULTS);
  }

  private normalizeCandidate(
    candidate: KartverketAddressCandidate,
  ): NormalizedAddress | null {
    const addressText = stringOrNull(candidate.adressetekst);

    if (!addressText) {
      return null;
    }

    const postalCode = stringOrNull(candidate.postnummer);
    const municipalityName = stringOrNull(candidate.kommunenavn);
    const normalizedAddress = [addressText, postalCode, municipalityName]
      .filter(Boolean)
      .join(', ');

    return {
      sourceReferenceId: buildSourceReferenceId(candidate),
      normalizedAddress,
      municipalityCode: stringOrNull(candidate.kommunenummer),
      municipalityName,
      postalCode,
      latitude: numberOrNull(candidate.representasjonspunkt?.lat),
      longitude: numberOrNull(candidate.representasjonspunkt?.lon),
    };
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
          integrationName: 'kartverket_address',
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
          integration: 'kartverket',
          event: input.eventType,
        },
        'Could not record Kartverket integration health event.',
      );
    }
  }

  private async recordOperationalFailure(input: {
    tenantId?: string;
    eventType: string;
    safeMessage: string;
    metadata: Prisma.InputJsonObject;
  }) {
    await this.operationalEventService.record({
      eventType: input.eventType,
      severity: 'error',
      source: 'kartverket_address',
      tenantId: input.tenantId,
      safeMessage: input.safeMessage,
      metadata: input.metadata,
    });
  }
}

function normalizeQuery(query: string) {
  const normalized = query.trim().replace(/\s+/g, ' ');

  if (normalized.length < 3) {
    throw new BadRequestException('Address search query is too short.');
  }

  if (normalized.length > 120) {
    throw new BadRequestException('Address search query is too long.');
  }

  return normalized;
}

function getBaseUrl() {
  return process.env.KARTVERKET_ADDRESS_BASE_URL ?? DEFAULT_BASE_URL;
}

function getTimeoutMs() {
  const parsed = Number(process.env.KARTVERKET_ADDRESS_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildSourceReferenceId(candidate: KartverketAddressCandidate) {
  const parts = [
    stringOrNull(candidate.kommunenummer),
    stringOrNull(candidate.adressekode),
    sourceReferencePart(candidate.nummer),
    stringOrNull(candidate.bokstav),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('-') : null;
}

function sourceReferencePart(value: unknown) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}
