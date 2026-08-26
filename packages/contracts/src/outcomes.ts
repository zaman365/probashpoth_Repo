import { z } from 'zod';
import { localizedTextSchema, moneySchema } from './primitives';

export const outcomeAggregateQuerySchema = z.object({
  path: z.enum(['work', 'study']),
  countryCode: z.string().length(2).optional(),
  organizationId: z.string().optional(),
  currency: z.string().length(3).optional(),
});
export type OutcomeAggregateQueryDto = z.infer<typeof outcomeAggregateQuerySchema>;

export const reviewOutcomeSchema = z.object({
  decision: z.enum(['verified', 'rejected', 'needs_more_evidence']),
  note: z.string().min(10).max(4000),
  evidenceDocumentIds: z.array(z.string()).default([]),
});
export type ReviewOutcomeDto = z.infer<typeof reviewOutcomeSchema>;

export const outcomeReviewSchema = reviewOutcomeSchema.extend({
  id: z.string(),
  path: z.enum(['work', 'study']),
  outcomeId: z.string(),
  outcomeOwnerUserId: z.string(),
  reviewerUserId: z.string(),
  reviewedAt: z.string(),
});
export type OutcomeReviewDto = z.infer<typeof outcomeReviewSchema>;

export const outcomeFollowUpSchema = z.object({
  id: z.string(),
  path: z.enum(['work', 'study']),
  resourceId: z.string(),
  checkpointDays: z.union([z.literal(90), z.literal(180)]),
  dueAt: z.string(),
  status: z.enum(['upcoming', 'due', 'recorded']),
  label: localizedTextSchema,
});
export type OutcomeFollowUpDto = z.infer<typeof outcomeFollowUpSchema>;

export const promisedActualFieldSchema = z.object({
  key: z.string(),
  promised: z.union([z.boolean(), z.string(), moneySchema]).nullable(),
  actual: z.union([z.boolean(), z.string(), moneySchema]).nullable(),
  state: z.enum(['matched', 'different', 'unknown']),
});

export const promisedActualComparisonSchema = z.object({
  id: z.string(),
  path: z.enum(['work', 'study']),
  outcomeId: z.string(),
  resourceId: z.string(),
  reviewStatus: z.enum(['pending', 'verified', 'rejected', 'needs_more_evidence']),
  fields: z.array(promisedActualFieldSchema),
  note: localizedTextSchema,
});
export type PromisedActualComparisonDto = z.infer<typeof promisedActualComparisonSchema>;

export const outcomeAggregateSchema = z.object({
  path: z.enum(['work', 'study']),
  countryCode: z.string().length(2).optional(),
  organizationId: z.string().optional(),
  currency: z.string().optional(),
  minimumCohortSize: z.literal(5),
  reviewedCohortSize: z.number().int().min(0),
  suppressed: z.boolean(),
  metrics: z
    .object({
      actualCostMedian: moneySchema.nullable(),
      actualCostMinimum: moneySchema.nullable(),
      actualCostMaximum: moneySchema.nullable(),
      promisedTermsMatchedPercent: z.number().min(0).max(100).nullable(),
      positiveOutcomePercent: z.number().min(0).max(100).nullable(),
    })
    .nullable(),
  privacyNotice: localizedTextSchema,
});
export type OutcomeAggregateDto = z.infer<typeof outcomeAggregateSchema>;

export const trustGraphEdgeSchema = z.object({
  id: z.string(),
  fromType: z.enum(['organization', 'job', 'program', 'country', 'route']),
  fromId: z.string(),
  toType: z.enum(['outcome_cohort', 'complaint_cohort', 'verification']),
  toId: z.string(),
  signal: z.enum(['terms_matched', 'positive_outcome', 'upheld_complaint', 'verified_evidence']),
  weight: z.number().min(-1).max(1),
  evidenceCount: z.number().int().min(1),
  public: z.boolean(),
  generatedAt: z.string(),
});
export type TrustGraphEdgeDto = z.infer<typeof trustGraphEdgeSchema>;

export const institutionalAnalyticsSchema = z.object({
  organizationId: z.string(),
  aggregate: outcomeAggregateSchema,
  trustEdges: z.array(trustGraphEdgeSchema),
  organicRanking: z.object({
    eligibleForOutcomeSignal: z.boolean(),
    outcomeSignal: z.number().min(0).max(100).nullable(),
    paymentInfluence: z.literal(false),
    safetyOverride: z.boolean(),
  }),
});
export type InstitutionalAnalyticsDto = z.infer<typeof institutionalAnalyticsSchema>;
