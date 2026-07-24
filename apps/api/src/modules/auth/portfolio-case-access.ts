import { ForbiddenException } from '@nestjs/common';
import type { CurrentUser } from './current-user';

export const PORTFOLIO_MUTABLE_SEED_CASE_IDS = new Set([
  'seed_kristiansand_case_building',
  'seed_arendal_case_building_permit',
  'seed_grimstad_case_road_damage',
]);

export function assertPortfolioGuestCanModifyCase(
  user: CurrentUser,
  caseId: string,
) {
  if (user.role !== 'portfolio_guest') return;

  if (
    !caseId.startsWith('seed_') ||
    PORTFOLIO_MUTABLE_SEED_CASE_IDS.has(caseId)
  ) {
    return;
  }

  throw new ForbiddenException(
    'Portfolio guests can modify visitor-created cases and designated demo cases only.',
  );
}
