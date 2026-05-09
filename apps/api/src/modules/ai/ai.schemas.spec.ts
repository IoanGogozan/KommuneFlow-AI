import { aiTriageOutputSchema } from './ai.schemas';

describe('AI triage output schema', () => {
  it('parses valid AI output', () => {
    expect(
      aiTriageOutputSchema.parse({
        category: 'building_case',
        suggestedDepartmentSlug: 'technical_department',
        urgency: 'normal',
        summary: 'The citizen asks about a garage extension permit.',
        missingInformation: ['property number'],
        confidence: 0.82,
        reasoningSummary:
          'The request mentions renovation and property documentation.',
      }),
    ).toMatchObject({
      category: 'building_case',
      suggestedDepartmentSlug: 'technical_department',
    });
  });

  it('rejects invalid AI output', () => {
    expect(() =>
      aiTriageOutputSchema.parse({
        category: 'unsupported_category',
        suggestedDepartmentSlug: 'technical_department',
        urgency: 'normal',
        summary: 'Summary',
        missingInformation: [],
        confidence: 1.5,
        reasoningSummary: 'Reason.',
      }),
    ).toThrow();
  });
});
