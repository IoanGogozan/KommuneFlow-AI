import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AI_PROVIDER } from './ai-provider';
import type { AIProvider } from './ai-provider';
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

    try {
      const providerResult = await this.aiProvider.generateCaseTriage({
        title: caseRecord.title,
        description: caseRecord.description,
        sourceLanguage: caseRecord.sourceLanguage,
        departments,
      });
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

      return result;
    } catch (error) {
      const result = await this.prisma.aITriageResult.create({
        data: {
          tenantId: user.tenantId,
          caseId: caseRecord.id,
          model: process.env.AI_PROVIDER ?? 'unknown',
          promptVersion: caseTriagePromptVersion,
          missingInformationJson: [],
          rawResponseJson: {},
          status: 'failed',
          failureReason: errorToMessage(error),
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
          reason: result.failureReason ?? 'unknown',
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

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : 'AI provider failed.';
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}
