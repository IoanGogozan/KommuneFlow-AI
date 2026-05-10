import {
  CaseCategory,
  CaseStatus,
  CaseUrgency,
  TenantLanguage,
} from '@prisma/client';
import { departments } from './data/departments';
import { tenants } from './data/tenants';

export type TenantSlug = (typeof tenants)[number]['slug'];
export type DepartmentSlug = (typeof departments)[number]['slug'];

export type DemoCase = {
  tenantSlug: TenantSlug;
  id: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;
  address: string;
  normalizedAddress: string;
  postalCode: string;
  title: string;
  description: string;
  sourceLanguage: TenantLanguage;
  departmentSlug: DepartmentSlug;
  category: CaseCategory;
  status: CaseStatus;
  urgency: CaseUrgency;
  createdDaysAgo: number;
  triageAfterMinutes?: number;
  closeAfterHours?: number;
  aiReview?: 'accepted' | 'corrected';
  aiFailed?: boolean;
  aiLowConfidence?: boolean;
  documentNames: string[];
};

export type TenantRef = { id: string };
export type DepartmentRef = { id: string };
export type UserRef = { id: string; email: string };

export type SeedContext = {
  snapshotDate: Date;
  importedAt: Date;
  analyticsRebuiltAt: Date;
  tenantMap: Map<TenantSlug, TenantRef>;
  departmentMap: Map<string, DepartmentRef>;
  adminByTenant: Map<TenantSlug, UserRef>;
};
