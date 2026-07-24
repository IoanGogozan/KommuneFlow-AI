import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { CurrentUser } from './current-user';
import { assertPortfolioGuestCanModifyCase } from './portfolio-case-access';

const guest = { role: UserRole.portfolio_guest } as CurrentUser;

describe('portfolio guest case mutation scope', () => {
  it('allows visitor-created and explicitly mutable seed cases', () => {
    expect(() =>
      assertPortfolioGuestCanModifyCase(guest, 'visitor_case_1'),
    ).not.toThrow();
    expect(() =>
      assertPortfolioGuestCanModifyCase(
        guest,
        'seed_kristiansand_case_building',
      ),
    ).not.toThrow();
  });

  it('rejects mutations to other seed cases', () => {
    expect(() =>
      assertPortfolioGuestCanModifyCase(guest, 'seed_kristiansand_case_school'),
    ).toThrow(ForbiddenException);
  });

  it('does not narrow normal staff access', () => {
    expect(() =>
      assertPortfolioGuestCanModifyCase(
        { role: UserRole.case_worker } as CurrentUser,
        'seed_kristiansand_case_school',
      ),
    ).not.toThrow();
  });
});
