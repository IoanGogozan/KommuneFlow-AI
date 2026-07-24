import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const tenantSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const positiveIntegerSchema = z.coerce.number().int().positive();

@Injectable()
export class PortfolioDemoConfig {
  readonly enabled;
  readonly allowedTenantSlugs;
  readonly defaultTenantSlug;
  readonly sessionTtlSeconds;

  constructor() {
    const config = parsePortfolioDemoConfig(process.env);
    this.enabled = config.enabled;
    this.allowedTenantSlugs = config.allowedTenantSlugs;
    this.defaultTenantSlug = config.defaultTenantSlug;
    this.sessionTtlSeconds = config.sessionTtlSeconds;
  }
}

export function parsePortfolioDemoConfig(env: NodeJS.ProcessEnv) {
  const enabled = env.PORTFOLIO_DEMO_ENABLED === 'true';
  const allowedTenantSlugs = new Set(
    (env.PORTFOLIO_DEMO_ALLOWED_TENANTS ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)
      .map((slug) => tenantSlugSchema.parse(slug)),
  );
  const defaultTenantSlug = tenantSlugSchema.parse(
    env.PORTFOLIO_DEMO_DEFAULT_TENANT ?? 'kristiansand',
  );
  const sessionTtlSeconds = positiveIntegerSchema
    .max(86_400)
    .parse(env.PORTFOLIO_DEMO_SESSION_TTL_SECONDS ?? '1800');

  if (enabled && !allowedTenantSlugs.has(defaultTenantSlug)) {
    throw new Error(
      'PORTFOLIO_DEMO_DEFAULT_TENANT must be included in PORTFOLIO_DEMO_ALLOWED_TENANTS.',
    );
  }

  return {
    enabled,
    allowedTenantSlugs,
    defaultTenantSlug,
    sessionTtlSeconds,
  };
}
