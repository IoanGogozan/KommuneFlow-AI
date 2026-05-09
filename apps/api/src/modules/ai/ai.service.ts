import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { appLogger } from '../../shared/logging/app-logger';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AI_PROVIDER } from './ai-provider';
import type { AIProvider } from './ai-provider';
import {
  classifyAIProviderError,
  safeAIProviderFailureReason,
} from './ai-provider-errors';
import { caseTriagePromptVersion } from './ai-prompts';
import { ReviewAITriageInput } from './ai.schemas';

@Injectable()
export class AIService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
  ) {}

  async runCaseTriage(caseId: string, user: CurrentUser) {
    const caseRecord = await this.findAccessibleCase(caseId, user);
    const departments = await this.prisma.department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });
    const startedAt = Date.now();

    try {
      const minimizedCase = minimizeCaseForAI({
        title: caseRecord.title,
        description: caseRecord.description,
      });
      const providerResult = await this.aiProvider.generateCaseTriage({
        title: minimizedCase.title,
        description: minimizedCase.description,
        sourceLanguage: caseRecord.sourceLanguage,
        departments,
      });
      const durationMs = Date.now() - startedAt;
      const suggestedDepartment = departments.find(
        (department) =>
          department.slug === providerResult.output.suggestedDepartmentSlug,
      );
      const result = await this.prisma.aITriageResult.create({
        data: {
          tenantId: user.tenantId,
          caseId: caseRecord.id,
          model: providerResult.model,
          promptVersion: providerResult.promptVersion,
          suggestedCategory: providerResult.output.category,
          suggestedDepartmentId: suggestedDepartment?.id,
          suggestedUrgency: providerResult.output.urgency,
          summary: providerResult.output.summary,
          missingInformationJson: providerResult.output.missingInformation,
          confidenceScore: providerResult.output.confidence,
          reasoningSummary: providerResult.output.reasoningSummary,
          rawResponseJson: providerResult.rawResponse as Prisma.InputJsonObject,
          status: 'completed',
        },
        include: aiTriageResultInclude,
      });

      await this.auditService.record({
        tenantId: user.tenantId,
        actor: user,
        action: 'ai.triage_result_created',
        entityType: 'ai_triage_result',
        entityId: result.id,
        metadata: {
          caseId: caseRecord.id,
          model: providerResult.model,
          promptVersion: providerResult.promptVersion,
        },
      });

      await this.recordAIObservabilityEvent({
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        aiTriageResultId: result.id,
        model: providerResult.model,
        promptVersion: providerResult.promptVersion,
        durationMs,
        status: 'success',
        tokenEstimate: providerResult.tokenEstimate,
        costEstimateCents: providerResult.costEstimateCents,
        metadata: {
          titleLength: minimizedCase.title.length,
          descriptionLength: minimizedCase.description.length,
          departmentCount: departments.length,
          inputWasTruncated: minimizedCase.inputWasTruncated,
        },
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const failureClassification = classifyAIProviderError(error);
      const failureReason = safeAIProviderFailureReason(error);
      const result = await this.prisma.aITriageResult.create({
        data: {
          tenantId: user.tenantId,
          caseId: caseRecord.id,
          model: process.env.AI_PROVIDER ?? 'unknown',
          promptVersion: caseTriagePromptVersion,
          missingInformationJson: [],
          rawResponseJson: {},
          status: 'failed',
          failureReason,
        },
        include: aiTriageResultInclude,
      });

      await this.auditService.record({
        tenantId: user.tenantId,
        actor: user,
        action: 'ai.triage_result_failed',
        entityType: 'ai_triage_result',
        entityId: result.id,
        metadata: {
          caseId: caseRecord.id,
          reason: failureReason,
          classification: failureClassification,
        },
      });

      await this.recordAIObservabilityEvent({
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        aiTriageResultId: result.id,
        model: process.env.AI_PROVIDER ?? 'unknown',
        promptVersion: caseTriagePromptVersion,
        durationMs,
        status: 'failed',
        failureClassification,
        failureReason,
        metadata: {
          departmentCount: departments.length,
        },
      });

      return result;
    }
  }

  async findLatestForCase(caseId: string, user: CurrentUser) {
    const caseRecord = await this.findAccessibleCase(caseId, user);

    return this.prisma.aITriageResult.findFirst({
      where: {
        tenantId: user.tenantId,
        caseId: caseRecord.id,
      },
      orderBy: { createdAt: 'desc' },
      include: aiTriageResultInclude,
    });
  }

  async reviewCaseTriage(
    caseId: string,
    resultId: string,
    user: CurrentUser,
    input: ReviewAITriageInput,
  ) {
    const caseRecord = await this.findAccessibleCase(caseId, user);
    this.assertCanUpdateCase(user, caseRecord.assignedDepartmentId);

    const result = await this.prisma.aITriageResult.findFirst({
      where: {
        id: resultId,
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        status: 'completed',
      },
      select: {
        id: true,
        suggestedCategory: true,
        suggestedDepartmentId: true,
        suggestedUrgency: true,
      },
    });

    if (!result) {
      throw new NotFoundException('AI triage result not found.');
    }

    const approvedDepartment = input.approvedDepartmentSlug
      ? await this.prisma.department.findFirst({
          where: {
            tenantId: user.tenantId,
            slug: input.approvedDepartmentSlug,
          },
          select: { id: true, slug: true },
        })
      : null;

    if (input.approvedDepartmentSlug && !approvedDepartment) {
      throw new NotFoundException('Approved department not found.');
    }

    const review = await this.prisma.aIReview.create({
      data: {
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        aiTriageResultId: result.id,
        reviewedByUserId: user.id,
        approvedCategory: input.approvedCategory,
        approvedDepartmentId: approvedDepartment?.id,
        approvedUrgency: input.approvedUrgency,
        reviewComment: emptyToNull(input.reviewComment),
        wasAiSuggestionAccepted: input.wasAiSuggestionAccepted,
      },
    });

    await this.prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        category: input.approvedCategory,
        assignedDepartmentId: approvedDepartment?.id ?? null,
        urgency: input.approvedUrgency,
        status: 'triaged',
      },
    });

    await this.prisma.aITriageResult.update({
      where: { id: result.id },
      data: { status: 'reviewed' },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'ai.triage_review_created',
      entityType: 'ai_review',
      entityId: review.id,
      metadata: {
        caseId: caseRecord.id,
        aiTriageResultId: result.id,
        wasAiSuggestionAccepted: input.wasAiSuggestionAccepted,
        approvedCategory: input.approvedCategory,
        approvedDepartmentSlug: approvedDepartment?.slug ?? null,
        approvedUrgency: input.approvedUrgency,
      },
    });

    return review;
  }

  private async findAccessibleCase(caseId: string, user: CurrentUser) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        sourceLanguage: true,
        assignedDepartmentId: true,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    this.assertCanReadCase(user, caseRecord.assignedDepartmentId);
    return caseRecord;
  }

  private assertCanReadCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (roleHasPermission(user.role, 'case:read:all_tenant')) {
      return;
    }

    if (
      roleHasPermission(user.role, 'case:read:department') &&
      user.departmentId &&
      assignedDepartmentId === user.departmentId
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this case.');
  }

  private assertCanUpdateCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (user.role === UserRole.auditor) {
      throw new ForbiddenException('Auditors cannot review AI triage.');
    }

    if (
      roleHasPermission(user.role, 'case:read:all_tenant') &&
      user.role === UserRole.super_admin
    ) {
      return;
    }

    if (
      roleHasPermission(user.role, 'case:update:department') &&
      user.departmentId &&
      assignedDepartmentId === user.departmentId
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to review this case.',
    );
  }

  private async recordAIObservabilityEvent(input: {
    tenantId: string;
    caseId: string;
    aiTriageResultId: string;
    model: string;
    promptVersion: string;
    durationMs: number;
    status: 'success' | 'failed';
    failureClassification?:
      | 'timeout'
      | 'provider_error'
      | 'invalid_response'
      | 'validation_failed';
    failureReason?: string;
    tokenEstimate?: number;
    costEstimateCents?: number;
    metadata: Prisma.InputJsonObject;
  }) {
    try {
      await this.prisma.aIObservabilityEvent.create({
        data: {
          tenantId: input.tenantId,
          caseId: input.caseId,
          aiTriageResultId: input.aiTriageResultId,
          model: input.model,
          promptVersion: input.promptVersion,
          durationMs: input.durationMs,
          status: input.status,
          failureClassification: input.failureClassification,
          failureReason: input.failureReason,
          tokenEstimate: input.tokenEstimate,
          costEstimateCents: input.costEstimateCents,
          metadataJson: input.metadata,
        },
      });
    } catch {
      appLogger.warn(
        {
          event: 'ai_observability_record_failed',
          tenantId: input.tenantId,
          caseId: input.caseId,
          status: input.status,
        },
        'Could not record AI observability event.',
      );
    }
  }
}

const aiTriageResultInclude = {
  suggestedDepartment: {
    select: {
      id: true,
      slug: true,
      name: true,
    },
  },
} satisfies Prisma.AITriageResultInclude;

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function minimizeCaseForAI(input: { title: string; description: string }) {
  const title = truncate(
    redactPersonalIdentifiers(normalizeText(input.title)),
    180,
  );
  const description = truncate(
    redactPersonalIdentifiers(normalizeText(input.description)),
    2_400,
  );

  return {
    title,
    description,
    inputWasTruncated:
      title.length < normalizeText(input.title).length ||
      description.length < normalizeText(input.description).length,
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function redactPersonalIdentifiers(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{11}\b/g, '[redacted-national-id]')
    .replace(/\b(?:\+47\s?)?(?:\d\s?){8}\b/g, '[redacted-phone]');
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
