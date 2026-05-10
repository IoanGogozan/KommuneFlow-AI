import { OpenAIProvider } from './openai.provider';
import { AIProviderError } from './ai-provider-errors';

const originalFetch = global.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalCi = process.env.CI;

describe('OpenAIProvider', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    delete process.env.CI;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
    jest.restoreAllMocks();
  });

  it('does not call OpenAI when CI is enabled', async () => {
    process.env.CI = 'true';
    global.fetch = jest.fn();

    await expect(provider().generateCaseTriage(input())).rejects.toMatchObject({
      classification: 'provider_error',
      safeReason: 'Real OpenAI calls are disabled in CI.',
    } satisfies Partial<AIProviderError>);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles OpenAI timeout safely', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      );

    await expect(provider().generateCaseTriage(input())).rejects.toMatchObject({
      classification: 'timeout',
      safeReason: 'AI provider timed out.',
    } satisfies Partial<AIProviderError>);
  });

  it('retries temporary provider failures and reports provider_error', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response(500, { error: 'failed' }));

    await expect(provider().generateCaseTriage(input())).rejects.toMatchObject({
      classification: 'provider_error',
      safeReason: 'AI provider returned an upstream error.',
    } satisfies Partial<AIProviderError>);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles invalid JSON output safely', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response(200, { output_text: 'not json' }));

    await expect(provider().generateCaseTriage(input())).rejects.toMatchObject({
      classification: 'invalid_response',
      safeReason: 'AI provider returned malformed JSON.',
    } satisfies Partial<AIProviderError>);
  });

  it('handles schema validation failures safely', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      response(200, {
        output_text: JSON.stringify({
          category: 'building_case',
          suggestedDepartmentSlug: 'technical_department',
        }),
      }),
    );

    await expect(provider().generateCaseTriage(input())).rejects.toMatchObject({
      classification: 'validation_failed',
      safeReason: 'AI provider response failed validation.',
    } satisfies Partial<AIProviderError>);
  });

  it('returns parsed triage output and token estimate on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      response(200, {
        output_text: JSON.stringify(validOutput()),
        usage: { total_tokens: 321 },
      }),
    );

    await expect(provider().generateCaseTriage(input())).resolves.toMatchObject(
      {
        output: {
          category: 'building_case',
        },
        tokenEstimate: 321,
      },
    );
  });
});

function provider() {
  return new OpenAIProvider();
}

function input() {
  return {
    title: 'Building permit',
    description: 'Citizen asks about garage permit documentation.',
    sourceLanguage: 'en',
    departments: [
      {
        slug: 'technical_department',
        name: 'Technical Department',
        description: 'Building cases and technical services.',
      },
    ],
  };
}

function response(status: number, body: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function validOutput() {
  return {
    category: 'building_case',
    suggestedDepartmentSlug: 'technical_department',
    urgency: 'normal',
    summary: 'The citizen asks about a building permit.',
    missingInformation: ['property number'],
    confidence: 0.82,
    reasoningSummary: 'The request mentions permit documentation.',
  };
}
