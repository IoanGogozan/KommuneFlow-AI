import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CurrentUser } from '../auth/current-user';

const routingRuleDefinitions = [
  {
    category: 'building_case',
    defaultDepartmentSlug: 'technical_department',
    urgencyRules: [
      'High urgency when safety, deadline, or blocked access is mentioned.',
    ],
  },
  {
    category: 'road_transport',
    defaultDepartmentSlug: 'technical_department',
    urgencyRules: [
      'High urgency when traffic safety or blocked road access is mentioned.',
    ],
  },
  {
    category: 'water_waste',
    defaultDepartmentSlug: 'water_waste',
    urgencyRules: [
      'High urgency when flooding, sewage, or drinking water risk is mentioned.',
    ],
  },
  {
    category: 'kindergarten_school',
    defaultDepartmentSlug: 'kindergarten_school',
    urgencyRules: [
      'High urgency when child safety or imminent school disruption is mentioned.',
    ],
  },
  {
    category: 'health_care',
    defaultDepartmentSlug: 'health_care',
    urgencyRules: [
      'High urgency when vulnerable residents or urgent care follow-up is mentioned.',
    ],
  },
  {
    category: 'tax_finance',
    defaultDepartmentSlug: 'general_administration',
    urgencyRules: [
      'Normal urgency unless payment deadline or collection risk is mentioned.',
    ],
  },
  {
    category: 'general_inquiry',
    defaultDepartmentSlug: 'general_administration',
    urgencyRules: [
      'Normal urgency unless the request explicitly describes immediate risk.',
    ],
  },
  {
    category: 'unknown',
    defaultDepartmentSlug: 'general_administration',
    urgencyRules: [
      'Manual triage recommended when category confidence is low.',
    ],
  },
] as const;

@Injectable()
export class RoutingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTenant(user: CurrentUser) {
    const departments = await this.prisma.department.findMany({
      where: {
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    const departmentsBySlug = new Map(
      departments.map((department) => [department.slug, department]),
    );

    return routingRuleDefinitions.map((rule) => ({
      category: rule.category,
      defaultDepartmentSlug: rule.defaultDepartmentSlug,
      defaultDepartment:
        departmentsBySlug.get(rule.defaultDepartmentSlug) ?? null,
      urgencyRules: rule.urgencyRules,
      source: 'static_config',
    }));
  }
}
