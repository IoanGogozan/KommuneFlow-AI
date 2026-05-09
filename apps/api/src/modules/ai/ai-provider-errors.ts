export type AIProviderFailureClassification =
  | 'timeout'
  | 'provider_error'
  | 'invalid_response'
  | 'validation_failed';

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly classification: AIProviderFailureClassification,
    readonly safeReason = message,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export function classifyAIProviderError(
  error: unknown,
): AIProviderFailureClassification {
  if (error instanceof AIProviderError) {
    return error.classification;
  }

  return 'provider_error';
}

export function safeAIProviderFailureReason(error: unknown) {
  if (error instanceof AIProviderError) {
    return error.safeReason;
  }

  return 'AI provider failed.';
}
