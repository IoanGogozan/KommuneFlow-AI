import { z } from 'zod';

export const caseCategorySchema = z.enum([
  'building_case',
  'kindergarten_school',
  'health_care',
  'road_transport',
  'tax_finance',
  'water_waste',
  'general_inquiry',
  'unknown',
]);

export const caseUrgencySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const aiTriageOutputSchema = z.object({
  category: caseCategorySchema,
  suggestedDepartmentSlug: z.string().trim().min(1).max(120),
  urgency: caseUrgencySchema,
  summary: z.string().trim().min(1).max(1000),
  missingInformation: z.array(z.string().trim().min(1).max(160)).max(20),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().trim().min(1).max(1000),
});

export type AITriageOutput = z.infer<typeof aiTriageOutputSchema>;

export const reviewAITriageSchema = z.object({
  approvedCategory: caseCategorySchema,
  approvedDepartmentSlug: z.string().trim().min(1).max(120).nullable(),
  approvedUrgency: caseUrgencySchema,
  reviewComment: z.string().trim().max(1000).optional().or(z.literal('')),
  wasAiSuggestionAccepted: z.boolean(),
});

export type ReviewAITriageInput = z.infer<typeof reviewAITriageSchema>;

export const aiTriageJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'category',
    'suggestedDepartmentSlug',
    'urgency',
    'summary',
    'missingInformation',
    'confidence',
    'reasoningSummary',
  ],
  properties: {
    category: {
      type: 'string',
      enum: caseCategorySchema.options,
    },
    suggestedDepartmentSlug: {
      type: 'string',
    },
    urgency: {
      type: 'string',
      enum: caseUrgencySchema.options,
    },
    summary: {
      type: 'string',
    },
    missingInformation: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    reasoningSummary: {
      type: 'string',
    },
  },
} as const;
