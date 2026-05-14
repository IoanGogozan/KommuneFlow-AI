import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('lists tenant-scoped audit events with safe metadata summaries', async () => {
    let capturedFindManyInput: unknown;
    const service = new AuditService({
      auditEvent: {
        findMany: jest.fn((input: unknown) => {
          capturedFindManyInput = input;
          return Promise.resolve([
            {
              id: 'audit_1',
              action: 'document.downloaded',
              entityType: 'case_document',
              entityId: 'document_1',
              actorRole: UserRole.auditor,
              metadataJson: {
                caseId: 'case_1',
                mimeType: 'application/pdf',
                sizeBytes: 2048,
                isSensitive: true,
                checksumSha256: 'do-not-return',
              },
              createdAt: new Date('2026-05-13T10:00:00.000Z'),
              actorUser: {
                id: 'user_1',
                name: 'Tenant Auditor',
                email: 'auditor@example.local',
              },
            },
          ]);
        }),
      },
    } as unknown as PrismaService);

    const result = await service.listRecentEvents(auditor(), {
      action: 'document.downloaded',
      actor: 'auditor',
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-13T23:59:59.000Z'),
    });

    expect(result).toEqual([
      {
        id: 'audit_1',
        action: 'document.downloaded',
        entityType: 'case_document',
        entityId: 'document_1',
        createdAt: new Date('2026-05-13T10:00:00.000Z'),
        actor: {
          id: 'user_1',
          name: 'Tenant Auditor',
          email: 'auditor@example.local',
          role: UserRole.auditor,
        },
        metadataSummary: {
          caseId: 'case_1',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          isSensitive: true,
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('do-not-return');
    expect(capturedFindManyInput).toMatchObject({
      where: {
        tenantId: 'tenant_1',
        action: 'document.downloaded',
      },
      take: 100,
    });
  });
});

function auditor() {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'auditor@example.local',
    role: UserRole.auditor,
  };
}
