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
    const category = chooseCategory(input);
    const department = chooseDepartment(input, category);
    const urgency = chooseUrgency(input);

    return Promise.resolve({
      model: 'mock-ai-provider',
      promptVersion: caseTriagePromptVersion,
      output: {
        category,
        suggestedDepartmentSlug: department.slug,
        urgency,
        summary: summarize(input.description),
        missingInformation: chooseMissingInformation(category),
        confidence: category === 'general_inquiry' ? 0.68 : 0.84,
        reasoningSummary:
          'The suggestion is based on multilingual municipal service keywords in the title and description.',
      },
      rawResponse: {
        provider: 'mock',
        promptVersion: caseTriagePromptVersion,
      },
    });
  }
}

function chooseCategory(input: AITriageInput) {
  const text = normalizeForMatching(`${input.title} ${input.description}`);
  const scores = categoryKeywordGroups.map((group) => ({
    category: group.category,
    score: scoreKeywords(text, group.keywords),
  }));
  const bestMatch = scores.reduce((best, item) =>
    item.score > best.score ? item : best,
  );

  return bestMatch.score > 0 ? bestMatch.category : 'general_inquiry';
}

function chooseDepartment(
  input: AITriageInput,
  category: ReturnType<typeof chooseCategory>,
) {
  const preferredDepartmentSlug = categoryDepartmentSlug[category];

  if (preferredDepartmentSlug) {
    const matchingDepartment = input.departments.find(
      (department) => department.slug === preferredDepartmentSlug,
    );

    if (matchingDepartment) {
      return matchingDepartment;
    }
  }

  return (
    input.departments.find((department) => {
      const searchableDepartment = normalizeForMatching(
        `${department.slug} ${department.name} ${department.description}`,
      );

      return categoryKeywordGroups
        .find((group) => group.category === category)
        ?.keywords.some((keyword) => searchableDepartment.includes(keyword));
    }) ??
    input.departments[0] ?? {
      slug: 'technical_department',
      name: 'Technical Department',
      description: '',
    }
  );
}

function chooseUrgency(input: AITriageInput) {
  const text = normalizeForMatching(`${input.title} ${input.description}`);
  const urgentKeywords = [
    'akutt',
    'alvorlig',
    'danger',
    'dangerous',
    'emergency',
    'farlig',
    'hazard',
    'urgent',
    'urgenta',
    'urgent',
    'pericol',
    'periculos',
    'risiko',
  ];
  const highKeywords = [
    'blocked',
    'blokkert',
    'leak',
    'lekkasje',
    'oversvommelse',
    'flood',
    'accident',
    'ulykke',
    'accident',
    'inundatie',
  ];

  if (urgentKeywords.some((keyword) => text.includes(keyword))) {
    return 'urgent' as const;
  }

  if (highKeywords.some((keyword) => text.includes(keyword))) {
    return 'high' as const;
  }

  return 'normal' as const;
}

function chooseMissingInformation(category: ReturnType<typeof chooseCategory>) {
  const categorySpecific = {
    building_case: ['property address or cadastral reference if relevant'],
    kindergarten_school: ['child, school, or kindergarten name if relevant'],
    health_care: ['service area and preferred contact information'],
    road_transport: ['exact location, direction, and photos if available'],
    tax_finance: ['invoice, fee, or case reference if relevant'],
    water_waste: ['address, container ID, or affected service if relevant'],
    general_inquiry: ['case reference or additional context if relevant'],
    unknown: ['case reference or additional context if relevant'],
  } satisfies Record<string, string[]>;

  return categorySpecific[category];
}

function summarize(description: string) {
  return description.length <= 240
    ? description
    : `${description.slice(0, 237)}...`;
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scoreKeywords(text: string, keywords: readonly string[]) {
  return keywords.reduce((score, keyword) => {
    if (text.includes(keyword)) {
      return score + 1;
    }

    return score;
  }, 0);
}

const categoryDepartmentSlug = {
  building_case: 'technical_department',
  kindergarten_school: 'kindergarten_school',
  health_care: 'health_care',
  road_transport: 'technical_department',
  tax_finance: 'general_administration',
  water_waste: 'water_waste',
  general_inquiry: 'general_administration',
  unknown: 'general_administration',
} as const;

const categoryKeywordGroups = [
  {
    category: 'building_case',
    keywords: [
      'autorizatie',
      'bygg',
      'byggesak',
      'building',
      'constructie',
      'dispensasjon',
      'garage',
      'garaj',
      'garasje',
      'permit',
      'tillatelse',
    ],
  },
  {
    category: 'kindergarten_school',
    keywords: [
      'barnehage',
      'elev',
      'gradinita',
      'kindergarten',
      'school',
      'scoala',
      'skole',
      'student',
    ],
  },
  {
    category: 'health_care',
    keywords: [
      'care',
      'helse',
      'health',
      'hjemmetjeneste',
      'lege',
      'omsorg',
      'sanatate',
      'sykehjem',
    ],
  },
  {
    category: 'road_transport',
    keywords: [
      'asfalt',
      'bus',
      'drum',
      'fortau',
      'gatelys',
      'hole',
      'pothole',
      'road',
      'strada',
      'traffic',
      'trafikk',
      'vei',
      'veg',
    ],
  },
  {
    category: 'tax_finance',
    keywords: [
      'avgift',
      'faktura',
      'fee',
      'finance',
      'gebyr',
      'invoice',
      'regning',
      'skatt',
      'tax',
      'taxa',
    ],
  },
  {
    category: 'water_waste',
    keywords: [
      'apa',
      'avfall',
      'avlop',
      'avløp',
      'container',
      'deseuri',
      'garbage',
      'gunoi',
      'renovasjon',
      'sewage',
      'søppel',
      'vann',
      'waste',
      'water',
    ],
  },
  {
    category: 'general_inquiry',
    keywords: ['general', 'henvendelse', 'informasjon', 'inquiry', 'spørsmål'],
  },
] as const;
