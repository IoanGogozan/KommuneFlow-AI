import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

export type PublicDemoSafetyConfig = {
  allowUploads: boolean;
  intakeLimit: number;
  intakeTtlMs: number;
  statusLimit: number;
  statusTtlMs: number;
  addressLimit: number;
  addressTtlMs: number;
  demoSessionLimit: number;
  demoSessionTtlMs: number;
};

export function getPublicDemoSafetyConfig(
  env: NodeJS.ProcessEnv = process.env,
): PublicDemoSafetyConfig {
  const portfolioEnabled = env.PORTFOLIO_DEMO_ENABLED === 'true';

  return {
    allowUploads:
      env.PUBLIC_DEMO_ALLOW_UPLOADS === undefined
        ? !portfolioEnabled
        : parseBoolean(env.PUBLIC_DEMO_ALLOW_UPLOADS),
    intakeLimit: parsePositiveInteger(
      env.PUBLIC_DEMO_INTAKE_LIMIT,
      3,
      'PUBLIC_DEMO_INTAKE_LIMIT',
    ),
    intakeTtlMs: parsePositiveInteger(
      env.PUBLIC_DEMO_INTAKE_TTL_MS,
      900_000,
      'PUBLIC_DEMO_INTAKE_TTL_MS',
    ),
    statusLimit: parsePositiveInteger(
      env.PUBLIC_DEMO_STATUS_LIMIT,
      20,
      'PUBLIC_DEMO_STATUS_LIMIT',
    ),
    statusTtlMs: parsePositiveInteger(
      env.PUBLIC_DEMO_STATUS_TTL_MS,
      60_000,
      'PUBLIC_DEMO_STATUS_TTL_MS',
    ),
    addressLimit: parsePositiveInteger(
      env.PUBLIC_DEMO_ADDRESS_LIMIT,
      20,
      'PUBLIC_DEMO_ADDRESS_LIMIT',
    ),
    addressTtlMs: parsePositiveInteger(
      env.PUBLIC_DEMO_ADDRESS_TTL_MS,
      60_000,
      'PUBLIC_DEMO_ADDRESS_TTL_MS',
    ),
    demoSessionLimit: parsePositiveInteger(
      env.PUBLIC_DEMO_SESSION_LIMIT,
      10,
      'PUBLIC_DEMO_SESSION_LIMIT',
    ),
    demoSessionTtlMs: parsePositiveInteger(
      env.PUBLIC_DEMO_SESSION_RATE_TTL_MS,
      600_000,
      'PUBLIC_DEMO_SESSION_RATE_TTL_MS',
    ),
  };
}

export function assertPublicUploadsAllowed(
  files: Express.Multer.File[],
  env: NodeJS.ProcessEnv = process.env,
) {
  if (files.length > 0 && !getPublicDemoSafetyConfig(env).allowUploads) {
    throw new ServiceUnavailableException(
      'File uploads are disabled in the public portfolio environment.',
    );
  }
}

function parseBoolean(value: string) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new BadRequestException('Invalid public demo safety configuration.');
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}
