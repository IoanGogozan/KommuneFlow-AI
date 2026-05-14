import { MockAIProvider } from './mock-ai.provider';

describe('MockAIProvider', () => {
  const departments = [
    {
      slug: 'technical_department',
      name: 'Technical Department',
      description: 'Building cases, roads, traffic, and technical services.',
    },
    {
      slug: 'kindergarten_school',
      name: 'Kindergarten and School',
      description: 'Kindergarten, school, and education-related services.',
    },
    {
      slug: 'health_care',
      name: 'Health and Care',
      description: 'Health, care, and welfare follow-up.',
    },
    {
      slug: 'water_waste',
      name: 'Water and Waste',
      description: 'Water, sewage, waste, and recycling services.',
    },
    {
      slug: 'general_administration',
      name: 'General Administration',
      description:
        'General inquiries, documents, and municipal administration.',
    },
  ];

  it('generates deterministic case triage output', async () => {
    const provider = new MockAIProvider();

    await expect(
      provider.generateCaseTriage({
        title: 'Request about building permit',
        description:
          'I need information about documentation required for a garage extension.',
        sourceLanguage: 'en',
        departments,
      }),
    ).resolves.toMatchObject({
      model: 'mock-ai-provider',
      promptVersion: 'case_triage_v1',
      output: {
        category: 'building_case',
        suggestedDepartmentSlug: 'technical_department',
      },
    });
  });

  it.each([
    [
      'Hull i kommunal vei',
      'Det er et farlig hull i veien ved skolen, og trafikken må ledes rundt.',
      'road_transport',
      'technical_department',
      'urgent',
    ],
    [
      'Søppel ikke hentet',
      'Renovasjon og avfall er ikke hentet denne uken.',
      'water_waste',
      'water_waste',
      'normal',
    ],
    [
      'Problema cu gradinita',
      'Copilul meu are nevoie de informatii despre loc la gradinita.',
      'kindergarten_school',
      'kindergarten_school',
      'normal',
    ],
    [
      'Faktura kommunale gebyrer',
      'Jeg har spørsmål om faktura, gebyr og betaling.',
      'tax_finance',
      'general_administration',
      'normal',
    ],
  ])(
    'classifies %s as %s and routes to %s',
    async (
      title,
      description,
      expectedCategory,
      expectedDepartmentSlug,
      expectedUrgency,
    ) => {
      const provider = new MockAIProvider();

      await expect(
        provider.generateCaseTriage({
          title,
          description,
          sourceLanguage: 'nb',
          departments,
        }),
      ).resolves.toMatchObject({
        output: {
          category: expectedCategory,
          suggestedDepartmentSlug: expectedDepartmentSlug,
          urgency: expectedUrgency,
        },
      });
    },
  );
});
