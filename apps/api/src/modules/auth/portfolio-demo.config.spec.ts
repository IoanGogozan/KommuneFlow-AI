import { parsePortfolioDemoConfig } from './portfolio-demo.config';

describe('PortfolioDemoConfig', () => {
  it('is disabled by default and uses the 30 minute guest TTL', () => {
    const config = parsePortfolioDemoConfig({});

    expect(config.enabled).toBe(false);
    expect(config.sessionTtlSeconds).toBe(1800);
    expect(config.defaultTenantSlug).toBe('kristiansand');
  });

  it('parses and validates the allowed tenant list once', () => {
    const config = parsePortfolioDemoConfig({
      PORTFOLIO_DEMO_ENABLED: 'true',
      PORTFOLIO_DEMO_ALLOWED_TENANTS: 'kristiansand, arendal',
      PORTFOLIO_DEMO_DEFAULT_TENANT: 'arendal',
      PORTFOLIO_DEMO_SESSION_TTL_SECONDS: '900',
    });

    expect(Array.from(config.allowedTenantSlugs)).toEqual([
      'kristiansand',
      'arendal',
    ]);
    expect(config.defaultTenantSlug).toBe('arendal');
    expect(config.sessionTtlSeconds).toBe(900);
  });

  it('rejects an enabled default tenant outside the allowlist', () => {
    expect(() =>
      parsePortfolioDemoConfig({
        PORTFOLIO_DEMO_ENABLED: 'true',
        PORTFOLIO_DEMO_ALLOWED_TENANTS: 'arendal',
        PORTFOLIO_DEMO_DEFAULT_TENANT: 'kristiansand',
      }),
    ).toThrow(
      'PORTFOLIO_DEMO_DEFAULT_TENANT must be included in PORTFOLIO_DEMO_ALLOWED_TENANTS.',
    );
  });
});
