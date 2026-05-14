import { appLogger } from '../shared/logging/app-logger';

type ProductionEnvLogger = Pick<typeof appLogger, 'warn'>;

const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STATUS_CODE_PEPPER',
  'CORS_ALLOWED_ORIGINS',
  'APP_BASE_URL',
  'API_BASE_URL',
  'UPLOAD_STORAGE_PATH',
] as const;

const secretVariables = ['JWT_SECRET', 'STATUS_CODE_PEPPER'] as const;

export function validateProductionEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  logger: ProductionEnvLogger = appLogger,
) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const failures = new Set<string>();

  for (const variableName of requiredProductionVariables) {
    if (!hasValue(env[variableName])) {
      failures.add(`${variableName} is required`);
    }
  }

  for (const variableName of secretVariables) {
    const value = env[variableName];

    if (hasValue(value) && isUnsafeSecret(value)) {
      failures.add(`${variableName} must be a strong production secret`);
    }
  }

  if (
    hasValue(env.STATUS_CODE_PEPPER) &&
    (env.STATUS_CODE_PEPPER === env.JWT_SECRET ||
      env.STATUS_CODE_PEPPER === env.SESSION_SECRET)
  ) {
    failures.add('STATUS_CODE_PEPPER must be separate from auth secrets');
  }

  if (hasValue(env.CORS_ALLOWED_ORIGINS)) {
    const origins = parseCsv(env.CORS_ALLOWED_ORIGINS);

    if (origins.length === 0 || origins.includes('*')) {
      failures.add('CORS_ALLOWED_ORIGINS must list explicit allowed origins');
    }
  }

  if (hasValue(env.APP_BASE_URL) && !isAbsoluteHttpUrl(env.APP_BASE_URL)) {
    failures.add('APP_BASE_URL must be an absolute HTTP(S) URL');
  }

  if (hasValue(env.API_BASE_URL) && !isAbsoluteHttpUrl(env.API_BASE_URL)) {
    failures.add('API_BASE_URL must be an absolute HTTP(S) URL');
  }

  if (env.AI_PROVIDER === 'openai' && !hasValue(env.OPENAI_API_KEY)) {
    failures.add('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  if (failures.size > 0) {
    throw new Error(
      `Invalid production API configuration: ${Array.from(failures).join('; ')}.`,
    );
  }

  if ((env.AI_PROVIDER ?? 'mock') === 'mock') {
    logger.warn(
      {
        event: 'production_mock_ai_provider',
        provider: 'mock',
      },
      'AI_PROVIDER=mock is enabled in production. This is allowed for demos, but real OpenAI triage will not run.',
    );
  }
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUnsafeSecret(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.length < 32) {
    return true;
  }

  return [
    'replace-with',
    'development-only',
    'local-development',
    'changeme',
    'change-me',
    'default-secret',
  ].some((marker) => normalized.includes(marker));
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
