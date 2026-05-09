import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

@Module({
  providers: [
    MockAIProvider,
    OpenAIProvider,
    {
      provide: AI_PROVIDER,
      inject: [MockAIProvider, OpenAIProvider],
      useFactory: (
        mockAIProvider: MockAIProvider,
        openAIProvider: OpenAIProvider,
      ) => {
        return process.env.AI_PROVIDER === 'openai'
          ? openAIProvider
          : mockAIProvider;
      },
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIModule {}
