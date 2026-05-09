# Domain Model

## Purpose Of This Document

This document defines the business entities, relationships, roles, permissions, states, and tenant isolation rules for KommuneFlow AI.

## Core Entities

### Tenant

Represents a municipality using the platform.

Required fields:

- `id`
- `name`
- `slug`
- `primaryLanguage`
- `createdAt`
- `updatedAt`

Example tenants:

- Arendal Kommune
- Grimstad Kommune
- Kristiansand Kommune

### Department

Represents a municipal department inside a tenant.

Required fields:

- `id`
- `tenantId`
- `name`
- `slug`
- `description`
- `createdAt`
- `updatedAt`

Example departments:

- Technical Department
- Kindergarten and School
- Health and Care
- Finance
- General Administration

### User

Represents an authenticated internal user.

Required fields:

- `id`
- `tenantId`
- `departmentId` nullable
- `email`
- `passwordHash`
- `name`
- `role`
- `status`
- `createdAt`
- `updatedAt`

### Citizen Profile

Represents citizen contact information connected to cases.

Required fields:

- `id`
- `tenantId`
- `name`
- `email`
- `phone` nullable
- `address` nullable
- `createdAt`
- `updatedAt`

### Case

Represents a citizen request.

Required fields:

- `id`
- `tenantId`
- `citizenProfileId`
- `assignedDepartmentId` nullable
- `assignedUserId` nullable
- `title`
- `description`
- `category`
- `status`
- `urgency`
- `sourceLanguage`
- `createdAt`
- `updatedAt`
- `closedAt` nullable

### Document

Represents an uploaded file.

Required fields:

- `id`
- `tenantId`
- `caseId`
- `uploadedByUserId` nullable
- `uploadedByCitizenProfileId` nullable
- `originalFilename`
- `mimeType`
- `fileSizeBytes`
- `storageKey`
- `checksumSha256`
- `extractedText` nullable
- `isSensitive`
- `createdAt`

### AI Triage Result

Represents the AI-generated suggestion for a case.

Required fields:

- `id`
- `tenantId`
- `caseId`
- `model`
- `promptVersion`
- `suggestedCategory`
- `suggestedDepartmentId` nullable
- `suggestedUrgency`
- `summary`
- `missingInformationJson`
- `confidenceScore`
- `reasoningSummary`
- `rawResponseJson`
- `status`
- `createdAt`

Allowed statuses:

- `pending`
- `completed`
- `failed`
- `reviewed`

Important rule: do not store chain-of-thought. Store only a short user-safe explanation in `reasoningSummary`.

### AI Review

Represents the human review of an AI suggestion.

Required fields:

- `id`
- `tenantId`
- `caseId`
- `aiTriageResultId`
- `reviewedByUserId`
- `approvedCategory`
- `approvedDepartmentId`
- `approvedUrgency`
- `reviewComment` nullable
- `wasAiSuggestionAccepted`
- `createdAt`

### Audit Event

Represents an append-only audit log entry.

Required fields:

- `id`
- `tenantId`
- `actorUserId` nullable
- `actorCitizenProfileId` nullable
- `actorRole` nullable
- `action`
- `entityType`
- `entityId`
- `ipAddress` nullable
- `userAgent` nullable
- `metadataJson`
- `createdAt`

## Case Status Values

Allowed values:

- `new`
- `triage_pending`
- `triaged`
- `in_progress`
- `waiting_for_citizen`
- `closed`
- `rejected`

## Case Category Values

Initial allowed values:

- `building_case`
- `kindergarten_school`
- `health_care`
- `road_transport`
- `tax_finance`
- `water_waste`
- `general_inquiry`
- `unknown`

## Role Model

Allowed roles:

- `citizen`
- `case_worker`
- `department_admin`
- `auditor`
- `super_admin`

## Permission Model

Permissions must be explicit.

Required permissions:

- `case:create`
- `case:read:own`
- `case:read:department`
- `case:read:all_tenant`
- `case:update:department`
- `case:close`
- `document:upload`
- `document:read:own`
- `document:read:department`
- `document:read:sensitive`
- `ai:triage:run`
- `ai:triage:review`
- `audit:read`
- `analytics:read`
- `tenant:manage`
- `user:manage`
- `routing_rules:manage`

## Tenant Isolation Rules

Every tenant-owned table must include `tenantId`.

Every backend query that reads or writes tenant-owned data must include tenant filtering.

Cross-tenant access is a critical security bug.

Automated tests must prove that:

- A user from tenant A cannot read cases from tenant B.
- A user from tenant A cannot read documents from tenant B.
- A user from tenant A cannot read audit events from tenant B.
- A case worker cannot access another department unless explicitly allowed.
