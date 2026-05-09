import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CaseCategory, CaseUrgency, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { AIProvider } from './ai-provider';
import { AIService } from './ai.service';

describe('AIService', () => {
  it('stores a valid AI triage result without mutating official case fields', async () => {
    const caseUpdateMock = jest.fn();
    let capturedResultCreateInput: unknown;
    const resultCreateMock = jest.fn((input: unknown) => {
      capturedResultCreateInput = input;
      return Promise.resolve({
        id: 'ai_result_1',
        status: 'completed',
        suggestedCategory: CaseCategory.building_case,
      });
    });
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue(caseRecord()),
        update: caseUpdateMock,
      },
      department: {
        findMany: jest.fn().mockResolvedValue([department()]),
      },
      aITriageResult: {
        create: resultCreateMock,
      },
    });

    await expect(
      service.runCaseTriage('case_1', caseWorker()),
    ).resolves.toMatchObject({
      id: 'ai_result_1',
      status: 'completed',
    });
    expect(caseUpdateMock).not.toHaveBeenCalled();
    const resultCreateInput = capturedResultCreateInput as {
      data: {
        suggestedCategory: CaseCategory;
        suggestedDepartmentId: string;
        suggestedUrgency: CaseUrgency;
        status: string;
      };
    };
    expect(resultCreateInput.data).toMatchObject({
      suggestedCategory: CaseCategory.building_case,
      suggestedDepartmentId: 'department_1',
      suggestedUrgency: CaseUrgency.normal,
      status: 'completed',
    });
  });

  it('stores a failed AI triage result when the provider fails', async () => {
    let capturedFailedCreateInput: unknown;
    const resultCreateMock = jest.fn((input: unknown) => {
      capturedFailedCreateInput = input;
      return Promise.resolve({
        id: 'ai_result_failed',
        status: 'failed',
        failureReason: 'Provider unavailable',
      });
    });
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue(caseRecord()),
        },
        department: {
          findMany: jest.fn().mockResolvedValue([department()]),
        },
        aITriageResult: {
          create: resultCreateMock,
        },
      },
      failingProvider(),
    );

    await expect(
      service.runCaseTriage('case_1', caseWorker()),
    ).resolves.toMatchObject({
      id: 'ai_result_failed',
      status: 'failed',
    });
    const failedCreateInput = capturedFailedCreateInput as {
      data: {
        status: string;
        failureReason: string;
      };
    };
    expect(failedCreateInput.data).toMatchObject({
      status: 'failed',
      failureReason: 'Provider unavailable',
    });
  });

  it('blocks cross-tenant AI triage by requiring tenant-filtered cases', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.runCaseTriage('case_from_other_tenant', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks auditors from reviewing AI triage', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue(caseRecord()),
      },
    });

    await expect(
      service.reviewCaseTriage('case_1', 'ai_result_1', auditor(), {
        approvedCategory: CaseCategory.building_case,
        approvedDepartmentSlug: 'technical_department',
        approvedUrgency: CaseUrgency.normal,
        reviewComment: '',
        wasAiSuggestionAccepted: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('human review updates official case fields and records an audit event', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    let capturedCaseUpdateInput: unknown;
    const caseUpdateMock = jest.fn((input: unknown) => {
      capturedCaseUpdateInput = input;
      return Promise.resolve({
        id: 'case_1',
        category: CaseCategory.building_case,
      });
    });
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue(caseRecord()),
          update: caseUpdateMock,
        },
        aITriageResult: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'ai_result_1',
            suggestedCategory: CaseCategory.building_case,
            suggestedDepartmentId: 'department_1',
            suggestedUrgency: CaseUrgency.normal,
          }),
          update: jest.fn().mockResolvedValue({ id: 'ai_result_1' }),
        },
        department: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'department_1',
            slug: 'technical_department',
          }),
        },
        aIReview: {
          create: jest.fn().mockResolvedValue({
            id: 'review_1',
          }),
        },
      },
      successfulProvider(),
      { record: auditRecordMock } as unknown as AuditService,
    );

    await expect(
      service.reviewCaseTriage('case_1', 'ai_result_1', caseWorker(), {
        approvedCategory: CaseCategory.building_case,
        approvedDepartmentSlug: 'technical_department',
        approvedUrgency: CaseUrgency.normal,
        reviewComment: 'Looks correct.',
        wasAiSuggestionAccepted: true,
      }),
    ).resolves.toMatchObject({
      id: 'review_1',
    });
    const caseUpdateInput = capturedCaseUpdateInput as {
      data: {
        category: CaseCategory;
        assignedDepartmentId: string;
        urgency: CaseUrgency;
        status: string;
      };
    };
    expect(caseUpdateInput.data).toMatchObject({
      category: CaseCategory.building_case,
      assignedDepartmentId: 'department_1',
      urgency: CaseUrgency.normal,
      status: 'triaged',
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ai.triage_review_created',
        entityType: 'ai_review',
      }),
    );
  });
});

function createService(
  prismaShape: Record<string, unknown>,
  aiProvider: AIProvider = successfulProvider(),
  auditService?: AuditService,
) {
  return new AIService(
    prismaShape as unknown as PrismaService,
    auditService ??
      ({
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as AuditService),
    aiProvider,
  );
}

function successfulProvider(): AIProvider {
  return {
    generateCaseTriage: jest.fn().mockResolvedValue({
      model: 'mock-ai-provider',
      promptVersion: 'case_triage_v1',
      output: {
        category: CaseCategory.building_case,
        suggestedDepartmentSlug: 'technical_department',
        urgency: CaseUrgency.normal,
        summary: 'The citizen asks about a building permit.',
        missingInformation: ['property number'],
        confidence: 0.82,
        reasoningSummary: 'The request mentions permit documentation.',
      },
      rawResponse: { provider: 'mock' },
    }),
  };
}

function failingProvider(): AIProvider {
  return {
    generateCaseTriage: jest
      .fn()
      .mockRejectedValue(new Error('Provider unavailable')),
  };
}

function caseWorker(): CurrentUser {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: 'department_1',
    email: 'case.worker@arendal.local',
    role: UserRole.case_worker,
  };
}

function auditor(): CurrentUser {
  return {
    id: 'user_2',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'auditor@arendal.local',
    role: UserRole.auditor,
  };
}

function caseRecord() {
  return {
    id: 'case_1',
    title: 'Request about building permit',
    description: 'I need information about documentation for a garage.',
    sourceLanguage: 'en',
    assignedDepartmentId: 'department_1',
  };
}

function department() {
  return {
    id: 'department_1',
    slug: 'technical_department',
    name: 'Technical Department',
    description: 'Building cases and technical services.',
  };
}
