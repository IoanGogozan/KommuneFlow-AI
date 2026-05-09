import { Injectable } from '@nestjs/common';
import { caseTriagePromptVersion } from './ai-prompts';
import {
  AIProvider,
  AITriageInput,
  AITriageProviderResult,
} from './ai-provider';

@Injectable()
export class MockAIProvider implements AIProvider {
  generateCaseTriage(input: AITriageInput): Promise<AITriageProviderResult> {
    const department = chooseDepartment(input);

    return Promise.resolve({
      model: 'mock-ai-provider',
      promptVersion: caseTriagePromptVersion,
      output: {
        category: chooseCategory(input),
        suggestedDepartmentSlug: department.slug,
        urgency: 'normal',
        summary: summarize(input.description),
        missingInformation: ['case reference or property details if relevant'],
        confidence: 0.82,
        reasoningSummary:
          'The suggestion is based on keywords in the title and description.',
      },
      rawResponse: {
        provider: 'mock',
        promptVersion: caseTriagePromptVersion,
      },
    });
  }
}

function chooseCategory(input: AITriageInput) {
  const text = `${input.title} ${input.description}`.toLowerCase();

  if (text.includes('school') || text.includes('kindergarten')) {
    return 'kindergarten_school' as const;
  }

  if (text.includes('road')) {
    return 'road_transport' as const;
  }

  if (text.includes('water') || text.includes('waste')) {
    return 'water_waste' as const;
  }

  if (text.includes('health') || text.includes('care')) {
    return 'health_care' as const;
  }

  if (text.includes('tax') || text.includes('invoice')) {
    return 'tax_finance' as const;
  }

  if (text.includes('building') || text.includes('permit')) {
    return 'building_case' as const;
  }

  return 'general_inquiry' as const;
}

function chooseDepartment(input: AITriageInput) {
  return (
    input.departments.find((department) =>
      department.slug.includes('technical'),
    ) ??
    input.departments[0] ?? {
      slug: 'technical_department',
      name: 'Technical Department',
      description: '',
    }
  );
}

function summarize(description: string) {
  return description.length <= 240
    ? description
    : `${description.slice(0, 237)}...`;
}
