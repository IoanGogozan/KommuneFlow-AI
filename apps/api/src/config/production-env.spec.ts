import { validateProductionEnvironment } from './production-env';

describe('validateProductionEnvironment', () => {
  const logger = {
    warn: jest.fn(),
  };

  beforeEach(() => {
    logger.warn.mockReset();
  });

  it('does nothing outside production', () => {
    expect(() =>
      validateProductionEnvironment(
        {
          NODE_ENV: 'development',
        },
        logger,
      ),
    ).not.toThrow();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('fails fast in production when required variables are missing', () => {
    expect(() =>
      validateProductionEnvironment(
        {
          NODE_ENV: 'production',
        },
        logger,
      ),
    ).toThrow(
      /DATABASE_URL is required.*JWT_SECRET is required.*STATUS_CODE_PEPPER is required.*CORS_ALLOWED_ORIGINS is required.*APP_BASE_URL is required.*API_BASE_URL is required.*UPLOAD_STORAGE_PATH is required/,
    );
  });

  it('rejects unsafe production secrets without printing secret values', () => {
    expect(() =>
      validateProductionEnvironment(
        validProductionEnv({
          JWT_SECRET: 'replace-with-at-least-32-random-bytes',
          STATUS_CODE_PEPPER: 'short',
        }),
        logger,
      ),
    ).toThrow(
      /JWT_SECRET must be a strong production secret.*STATUS_CODE_PEPPER must be a strong production secret/,
    );

    try {
      validateProductionEnvironment(
        validProductionEnv({
          JWT_SECRET: 'replace-with-at-least-32-random-bytes',
          STATUS_CODE_PEPPER: 'short',
        }),
        logger,
      );
    } catch (error) {
      expect(String(error)).not.toContain(
        'replace-with-at-least-32-random-bytes',
      );
      expect(String(error)).not.toContain('short');
    }
  });

  it('requires a separate status code pepper', () => {
    const sharedSecret = 'a'.repeat(40);

    expect(() =>
      validateProductionEnvironment(
        validProductionEnv({
          JWT_SECRET: sharedSecret,
          STATUS_CODE_PEPPER: sharedSecret,
        }),
        logger,
      ),
    ).toThrow(/STATUS_CODE_PEPPER must be separate from auth secrets/);
  });

  it('requires explicit CORS origins and absolute app URLs', () => {
    expect(() =>
      validateProductionEnvironment(
        validProductionEnv({
          CORS_ALLOWED_ORIGINS: '*',
          APP_BASE_URL: '/relative',
          API_BASE_URL: '/api/v1',
        }),
        logger,
      ),
    ).toThrow(
      /CORS_ALLOWED_ORIGINS must list explicit allowed origins.*APP_BASE_URL must be an absolute HTTP\(S\) URL.*API_BASE_URL must be an absolute HTTP\(S\) URL/,
    );
  });

  it('requires OPENAI_API_KEY when OpenAI is enabled in production', () => {
    expect(() =>
      validateProductionEnvironment(
        validProductionEnv({
          AI_PROVIDER: 'openai',
          OPENAI_API_KEY: '',
        }),
        logger,
      ),
    ).toThrow(/OPENAI_API_KEY is required when AI_PROVIDER=openai/);
  });

  it('allows mock AI provider in production but logs a clear warning', () => {
    expect(() =>
      validateProductionEnvironment(validProductionEnv(), logger),
    ).not.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      {
        event: 'production_mock_ai_provider',
        provider: 'mock',
      },
      expect.stringContaining('AI_PROVIDER=mock is enabled in production'),
    );
  });

  it('passes with OpenAI production configuration', () => {
    expect(() =>
      validateProductionEnvironment(
        validProductionEnv({
          AI_PROVIDER: 'openai',
          OPENAI_API_KEY: 'test-openai-key',
        }),
        logger,
      ),
    ).not.toThrow();

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

function validProductionEnv(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@postgres:5432/kommuneflow',
    JWT_SECRET: 'j'.repeat(40),
    SESSION_SECRET: 's'.repeat(40),
    STATUS_CODE_PEPPER: 'p'.repeat(40),
    CORS_ALLOWED_ORIGINS: 'https://example.com',
    APP_BASE_URL: 'https://example.com',
    API_BASE_URL: 'https://example.com/api/v1',
    UPLOAD_STORAGE_PATH: '/app/uploads',
    AI_PROVIDER: 'mock',
    ...overrides,
  };
}
