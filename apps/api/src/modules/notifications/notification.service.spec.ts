import { CaseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MockEmailMessage, MockEmailProvider } from './mock-email.provider';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  it('logs confirmation email through the mock provider', async () => {
    let capturedCreateInput: unknown;
    const sentMessages: MockEmailMessage[] = [];
    const sendMock = jest.fn((message: MockEmailMessage) => {
      sentMessages.push(message);

      return Promise.resolve({
        provider: 'mock',
        status: 'logged',
        sentAt: null,
        messageId: 'mock_case_confirmation_1',
      });
    });
    const provider = {
      send: sendMock,
    } as unknown as MockEmailProvider;
    const service = new NotificationService(
      {
        emailLog: {
          create: jest.fn((input: unknown) => {
            capturedCreateInput = input;
            return Promise.resolve({
              id: 'email_1',
              template: 'case_confirmation',
              status: 'logged',
              provider: 'mock',
              createdAt: new Date('2026-05-10T10:00:00.000Z'),
            });
          }),
        },
      } as unknown as PrismaService,
      provider,
    );

    await expect(
      service.logCaseConfirmation({
        tenantId: 'tenant_1',
        caseId: 'case_1',
        recipientEmail: 'Citizen@Example.Local',
        caseReference: 'KF-2026-ABCD1234',
        statusAccessCode: 'ABC123XYZ',
        title: 'Road damage report',
      }),
    ).resolves.toMatchObject({
      template: 'case_confirmation',
      status: 'logged',
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'Citizen@Example.Local',
        template: 'case_confirmation',
      }),
    );
    const sentEmail = sentMessages[0];
    expect(sentEmail.bodyText).toContain('ABC123XYZ');
    expect(capturedCreateInput).toMatchObject({
      data: {
        tenantId: 'tenant_1',
        caseId: 'case_1',
        recipientEmail: 'citizen@example.local',
        template: 'case_confirmation',
        provider: 'mock',
        status: 'logged',
      },
    });
    const storedEmail = capturedCreateInput as {
      data: {
        bodyText: string;
        metadataJson: { statusAccessCodeMasked?: string };
      };
    };
    expect(storedEmail.data.bodyText).toContain('ABC1-*****');
    expect(storedEmail.data.metadataJson.statusAccessCodeMasked).toBe(
      'ABC1-*****',
    );
    expect(JSON.stringify(capturedCreateInput)).not.toContain('ABC123XYZ');
  });

  it('logs status-change email through the mock provider', async () => {
    let capturedCreateInput: unknown;
    const sendMock = jest.fn().mockResolvedValue({
      provider: 'mock',
      status: 'logged',
      sentAt: null,
      messageId: 'mock_case_status_changed_1',
    });
    const service = new NotificationService(
      {
        emailLog: {
          create: jest.fn((input: unknown) => {
            capturedCreateInput = input;
            return Promise.resolve({
              id: 'email_2',
              template: 'case_status_changed',
              status: 'logged',
              provider: 'mock',
              createdAt: new Date('2026-05-10T10:00:00.000Z'),
            });
          }),
        },
      } as unknown as PrismaService,
      {
        send: sendMock,
      },
    );

    await expect(
      service.logStatusChanged({
        tenantId: 'tenant_1',
        caseId: 'case_1',
        recipientEmail: 'Citizen@Example.Local',
        caseReference: 'KF-2026-ABCD1234',
        previousStatus: CaseStatus.new,
        nextStatus: CaseStatus.in_progress,
      }),
    ).resolves.toMatchObject({
      template: 'case_status_changed',
      status: 'logged',
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'Citizen@Example.Local',
        template: 'case_status_changed',
      }),
    );
    expect(capturedCreateInput).toMatchObject({
      data: {
        tenantId: 'tenant_1',
        caseId: 'case_1',
        recipientEmail: 'citizen@example.local',
        template: 'case_status_changed',
        provider: 'mock',
        status: 'logged',
        metadataJson: {
          caseReference: 'KF-2026-ABCD1234',
          previousStatus: 'new',
          nextStatus: 'in_progress',
          mockMessageId: 'mock_case_status_changed_1',
        },
      },
    });
  });
});
