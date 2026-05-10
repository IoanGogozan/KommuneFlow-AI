import { Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  buildCaseTriageSystemPrompt,
  buildCaseTriageUserPrompt,
  caseTriagePromptVersion,
} from './ai-prompts';
import {
  AIProvider,
  AITriageInput,
  AITriageProviderResult,
} from './ai-provider';
import { AIProviderError } from './ai-provider-errors';
import { aiTriageJsonSchema, aiTriageOutputSchema } from './ai.schemas';

type OpenAIResponse = {
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export const OPENAI_DEFAULT_TIMEOUT_MS = 15_000;
export const OPENAI_MAX_ATTEMPTS = 2;

@Injectable()
export class OpenAIProvider implements AIProvider {
  async generateCaseTriage(
    input: AITriageInput,
  ): Promise<AITriageProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new AIProviderError(
        'OPENAI_API_KEY is not configured.',
        'provider_error',
        'AI provider is not configured.',
      );
    }

    if (process.env.CI === 'true') {
      throw new AIProviderError(
        'OpenAI calls are disabled in CI.',
        'provider_error',
        'Real OpenAI calls are disabled in CI.',
      );
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const response = await fetchWithRetry({
      apiKey,
      model,
      input,
    });

    let rawResponse: Record<string, unknown>;

    try {
      rawResponse = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new AIProviderError(
        'OpenAI response was not valid JSON.',
        'invalid_response',
        'AI provider returned an invalid response.',
      );
    }

    if (!response.ok) {
      throw new AIProviderError(
        'OpenAI triage request failed.',
        'provider_error',
        'AI provider returned an upstream error.',
      );
    }

    const outputText = extractOutputText(rawResponse);
    const parsedOutput = parseOutput(outputText);
    const usage = (rawResponse as OpenAIResponse).usage;

    return {
      model,
      promptVersion: caseTriagePromptVersion,
      output: parsedOutput,
      rawResponse,
      tokenEstimate: usage?.total_tokens,
    };
  }
}

async function fetchWithRetry(input: {
  apiKey: string;
  model: string;
  input: AITriageInput;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          input: [
            {
              role: 'system',
              content: buildCaseTriageSystemPrompt(),
            },
            {
              role: 'user',
              content: buildCaseTriageUserPrompt(input.input),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'case_triage',
              strict: true,
              schema: aiTriageJsonSchema,
            },
          },
        }),
        signal: AbortSignal.timeout(getOpenAITimeoutMs()),
      });

      if (
        !isRetryableStatus(response.status) ||
        attempt === OPENAI_MAX_ATTEMPTS
      ) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (!isAbortError(error) || attempt === OPENAI_MAX_ATTEMPTS) {
        break;
      }
    }
  }

  if (isAbortError(lastError)) {
    throw new AIProviderError(
      'OpenAI triage request timed out.',
      'timeout',
      'AI provider timed out.',
    );
  }

  throw new AIProviderError(
    'OpenAI triage request failed.',
    'provider_error',
    'AI provider returned an upstream error.',
  );
}

function extractOutputText(rawResponse: Record<string, unknown>) {
  const response = rawResponse as OpenAIResponse;

  if (response.output_text) {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text' && content.text)?.text;

  if (!text) {
    throw new AIProviderError(
      'OpenAI response did not include text.',
      'invalid_response',
      'AI provider returned an invalid response.',
    );
  }

  return text;
}

function parseOutput(outputText: string) {
  try {
    return aiTriageOutputSchema.parse(JSON.parse(outputText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AIProviderError(
        'OpenAI response text was not valid JSON.',
        'invalid_response',
        'AI provider returned malformed JSON.',
      );
    }

    if (error instanceof ZodError) {
      throw new AIProviderError(
        'OpenAI response failed schema validation.',
        'validation_failed',
        'AI provider response failed validation.',
      );
    }

    throw error;
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

export function getOpenAITimeoutMs() {
  const parsed = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : OPENAI_DEFAULT_TIMEOUT_MS;
}
