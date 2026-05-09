import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AIController } from './ai.controller';
import { AI_PROVIDER } from './ai-provider';
import { AIService } from './ai.service';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AIController],
  providers: [
    AIService,
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
  exports: [AI_PROVIDER, AIService],
})
export class AIModule {}
