import { runDemoReset, validateResetSafety } from '../../prisma/demo-reset';

const safeEnv = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/kommuneflow_demo',
  PORTFOLIO_DEMO_ENABLED: 'true',
  PORTFOLIO_DEMO_RESET_CONFIRM: 'true',
  PORTFOLIO_DEMO_RESET_DATABASE_NAME: 'kommuneflow_demo',
  PORTFOLIO_DEMO_RESET_AFTER_HOURS: '6',
  UPLOAD_STORAGE_PATH: './storage/demo-uploads',
};

describe('portfolio demo reset', () => {
  it('refuses missing confirmation, disabled mode, wrong database, and unsafe storage', () => {
    expect(() =>
      validateResetSafety({
        ...safeEnv,
        PORTFOLIO_DEMO_ENABLED: 'false',
      }),
    ).toThrow('PORTFOLIO_DEMO_ENABLED');
    expect(() =>
      validateResetSafety({
        ...safeEnv,
        PORTFOLIO_DEMO_RESET_CONFIRM: 'false',
      }),
    ).toThrow('PORTFOLIO_DEMO_RESET_CONFIRM');
    expect(() =>
      validateResetSafety({
        ...safeEnv,
        PORTFOLIO_DEMO_RESET_DATABASE_NAME: 'production',
      }),
    ).toThrow('database name does not match');
    expect(() =>
      validateResetSafety({
        ...safeEnv,
        UPLOAD_STORAGE_PATH: '.',
      }),
    ).toThrow('unsafe upload storage path');
  });

  it('deletes only expired visitor data and associated files, then restores seeds', async () => {
    const visitorCases = [
      {
        id: 'visitor_case_1',
        citizenProfileId: 'citizen_1',
        documents: [
          {
            id: 'document_1',
            storageKey: 'tenant/case/document.pdf',
          },
        ],
      },
    ];
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(visitorCases)
      .mockResolvedValueOnce([]);
    const transaction = {
      aIObservabilityEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      emailLog: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      internalNote: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      aIReview: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      aITriageResult: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      case: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      citizenProfile: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      case: { findMany },
      aITriageResult: {
        findMany: jest.fn().mockResolvedValue([{ id: 'seed_triage_result_1' }]),
      },
      $transaction: jest.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const removeFile = jest.fn().mockResolvedValue(undefined);
    const restoreSeeds = jest.fn().mockResolvedValue(18);
    const now = new Date('2026-07-24T12:00:00.000Z');

    const first = await runDemoReset(prisma as never, {
      env: safeEnv,
      now,
      removeFile,
      restoreSeeds,
    });
    const second = await runDemoReset(prisma as never, {
      env: safeEnv,
      now,
      removeFile,
      restoreSeeds,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: { lt: new Date('2026-07-24T06:00:00.000Z') },
          NOT: { id: { startsWith: 'seed_' } },
        },
      }),
    );
    expect(transaction.case.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['visitor_case_1'] } },
    });
    expect(transaction.internalNote.deleteMany).toHaveBeenCalledTimes(2);
    expect(transaction.aITriageResult.deleteMany).toHaveBeenCalledTimes(2);
    expect(removeFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /storage[\\/]demo-uploads[\\/]tenant[\\/]case[\\/]document\.pdf$/,
      ),
    );
    expect(first).toMatchObject({
      deletedCases: 1,
      deletedCitizenProfiles: 1,
      deletedFiles: 1,
      seedCasesRestored: 18,
    });
    expect(second).toMatchObject({
      deletedCases: 0,
      deletedCitizenProfiles: 0,
      deletedFiles: 0,
      seedCasesRestored: 18,
    });
    expect(restoreSeeds).toHaveBeenCalledTimes(2);
  });
});
