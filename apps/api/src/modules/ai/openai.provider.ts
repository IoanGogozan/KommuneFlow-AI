import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
import { aiTriageJsonSchema, aiTriageOutputSchema } from './ai.schemas';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

@Injectable()
export class OpenAIProvider implements AIProvider {
  async generateCaseTriage(
    input: AITriageInput,
  ): Promise<AITriageProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY is not configured.',
      );
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: buildCaseTriageSystemPrompt(),
          },
          {
            role: 'user',
            content: buildCaseTriageUserPrompt(input),
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
    });

    const rawResponse = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new ServiceUnavailableException('OpenAI triage request failed.');
    }

    const outputText = extractOutputText(rawResponse);
    const parsedOutput = aiTriageOutputSchema.parse(JSON.parse(outputText));

    return {
      model,
      promptVersion: caseTriagePromptVersion,
      output: parsedOutput,
      rawResponse,
    };
  }
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
    throw new ServiceUnavailableException(
      'OpenAI response did not include text.',
    );
  }

  return text;
}
