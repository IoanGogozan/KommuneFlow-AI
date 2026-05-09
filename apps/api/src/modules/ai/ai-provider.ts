import { AITriageOutput } from './ai.schemas';

export type AITriageInput = {
  title: string;
  description: string;
  sourceLanguage: string;
  departments: Array<{
    slug: string;
    name: string;
    description: string;
  }>;
};

export type AITriageProviderResult = {
  model: string;
  promptVersion: string;
  output: AITriageOutput;
  rawResponse: Record<string, unknown>;
};

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProvider {
  generateCaseTriage(input: AITriageInput): Promise<AITriageProviderResult>;
}
