import { createPublicCaseSchema } from './cases.schemas';

describe('createPublicCaseSchema', () => {
  it('accepts a valid public intake payload', () => {
    expect(() =>
      createPublicCaseSchema.parse({
        citizen: {
          name: 'Demo Citizen',
          email: 'citizen@example.local',
        },
        case: {
          title: 'Road damage report',
          description:
            'There is a damaged road surface near the school entrance.',
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      }),
    ).not.toThrow();
  });

  it('rejects invalid input', () => {
    expect(() =>
      createPublicCaseSchema.parse({
        citizen: {
          name: '',
          email: 'not-an-email',
        },
        case: {
          title: 'Bad',
          description: 'Too short',
          sourceLanguage: 'de',
        },
        privacyAccepted: false,
      }),
    ).toThrow();
  });
});
