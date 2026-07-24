import { ServiceUnavailableException } from '@nestjs/common';
import {
  assertPublicUploadsAllowed,
  getPublicDemoSafetyConfig,
} from './public-demo-safety';

describe('public demo safety configuration', () => {
  it('disables uploads by default when portfolio mode is enabled', () => {
    expect(
      getPublicDemoSafetyConfig({
        PORTFOLIO_DEMO_ENABLED: 'true',
      }).allowUploads,
    ).toBe(false);
  });

  it('keeps local uploads available unless explicitly disabled', () => {
    expect(getPublicDemoSafetyConfig({}).allowUploads).toBe(true);
    expect(
      getPublicDemoSafetyConfig({
        PUBLIC_DEMO_ALLOW_UPLOADS: 'true',
        PORTFOLIO_DEMO_ENABLED: 'true',
      }).allowUploads,
    ).toBe(true);
  });

  it('uses configurable limits with safe defaults', () => {
    expect(getPublicDemoSafetyConfig({})).toMatchObject({
      intakeLimit: 3,
      intakeTtlMs: 900_000,
      statusLimit: 20,
      statusTtlMs: 60_000,
      addressLimit: 20,
      addressTtlMs: 60_000,
      demoSessionLimit: 10,
      demoSessionTtlMs: 600_000,
    });
  });

  it('rejects public files when disabled but allows file-free intake', () => {
    expect(() =>
      assertPublicUploadsAllowed([], {
        PUBLIC_DEMO_ALLOW_UPLOADS: 'false',
      }),
    ).not.toThrow();
    expect(() =>
      assertPublicUploadsAllowed([{} as Express.Multer.File], {
        PUBLIC_DEMO_ALLOW_UPLOADS: 'false',
      }),
    ).toThrow(ServiceUnavailableException);
  });
});
