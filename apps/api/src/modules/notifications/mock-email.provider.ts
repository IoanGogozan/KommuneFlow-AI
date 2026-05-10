import { Injectable } from '@nestjs/common';

export type MockEmailMessage = {
  to: string;
  subject: string;
  bodyText: string;
  template: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class MockEmailProvider {
  send(message: MockEmailMessage) {
    return Promise.resolve({
      provider: 'mock',
      status: 'logged',
      sentAt: null,
      messageId: `mock_${message.template}_${Date.now()}`,
    });
  }
}
