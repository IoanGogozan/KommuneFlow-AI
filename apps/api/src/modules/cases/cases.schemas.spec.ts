import {
  createPublicCaseSchema,
  publicCaseStatusSchema,
} from './cases.schemas';

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

describe('publicCaseStatusSchema', () => {
  it('trims and bounds status lookup credentials', () => {
    expect(
      publicCaseStatusSchema.parse({
        caseReference: '  KF-2026-0001 ',
        statusAccessCode: ' ABC12345 ',
      }),
    ).toEqual({
      caseReference: 'KF-2026-0001',
      statusAccessCode: 'ABC12345',
    });
    expect(() =>
      publicCaseStatusSchema.parse({
        caseReference: 'KF-2026-0001',
        statusAccessCode: 'x'.repeat(41),
      }),
    ).toThrow();
  });
});
