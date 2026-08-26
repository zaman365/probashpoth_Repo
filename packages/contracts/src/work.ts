import { z } from 'zod';
import { localizedTextSchema, moneySchema, sourceSummarySchema } from './primitives';
import { decisionTraceSchema, jobDetailSchema, routeSummarySchema } from './catalogue';
import { caseDetailSchema, costPlanSchema } from './cases';

export const workDiscoveryModeSchema = z.enum(['occupation', 'profile', 'country', 'best_fit']);

export const workDiscoveryQuerySchema = z.object({
  mode: workDiscoveryModeSchema.default('best_fit'),
  occupationKey: z.string().optional(),
  countryCode: z.string().length(2).optional(),
});
export type WorkDiscoveryQueryDto = z.infer<typeof workDiscoveryQuerySchema>;

export const workOpportunitySchema = z.object({
  route: routeSummarySchema,
  eligibility: decisionTraceSchema,
  readinessPercent: z.number().int().min(0).max(100),
  missingActions: z.array(localizedTextSchema),
  estimatedPreparationDays: z.number().int().min(0).nullable(),
  openJobCount: z.number().int().min(0),
  salaryRange: z
    .object({ minimum: moneySchema, maximum: moneySchema, sampleSize: z.number().int().positive() })
    .nullable(),
  livingCost: z.object({ amount: moneySchema.nullable(), status: z.literal('unknown') }),
  estimatedSavings: z.object({ amount: moneySchema.nullable(), status: z.literal('unknown') }),
  longTermRoute: localizedTextSchema.optional(),
  sourceQuality: z.enum(['official', 'mixed', 'review_required']),
  sources: z.array(sourceSummarySchema),
});
export type WorkOpportunityDto = z.infer<typeof workOpportunitySchema>;

export const workDiscoveryResultSchema = z.object({
  mode: workDiscoveryModeSchema,
  passportVersion: z.number().int(),
  generatedAt: z.string(),
  opportunities: z.array(workOpportunitySchema),
  note: localizedTextSchema,
});
export type WorkDiscoveryResultDto = z.infer<typeof workDiscoveryResultSchema>;

export const createWorkApplicationSchema = z.object({
  jobId: z.string(),
  eligibilityAcknowledged: z.boolean().default(false),
});
export type CreateWorkApplicationDto = z.infer<typeof createWorkApplicationSchema>;

export const workApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  caseId: z.string(),
  status: z.enum([
    'draft',
    'submitted',
    'screening',
    'interview',
    'offer_received',
    'accepted',
    'rejected',
    'withdrawn',
  ]),
  eligibilityAtSubmission: z.enum(['eligible', 'conditional', 'ineligible', 'unknown']),
  submittedAt: z.string(),
  updatedAt: z.string(),
  rejectionReason: localizedTextSchema.optional(),
});
export type WorkApplicationDto = z.infer<typeof workApplicationSchema>;

export const workOfferReviewSchema = z.object({
  application: workApplicationSchema,
  job: jobDetailSchema,
  case: caseDetailSchema,
  costPlan: costPlanSchema,
  unresolvedRiskIds: z.array(z.string()),
  takeHomeEstimate: z.object({ amount: moneySchema.nullable(), status: z.literal('unknown') }),
  breakEvenMonths: z.object({ value: z.number().nullable(), status: z.literal('unknown') }),
  acceptanceBlocked: z.boolean(),
  acknowledgementRequired: z.boolean(),
});
export type WorkOfferReviewDto = z.infer<typeof workOfferReviewSchema>;

export const decideWorkOfferSchema = z.object({
  decision: z.enum(['accept', 'decline']),
  acknowledgedRiskIds: z.array(z.string()).default([]),
});
export type DecideWorkOfferDto = z.infer<typeof decideWorkOfferSchema>;

export const workOfferDecisionSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  userId: z.string(),
  decision: z.enum(['accepted', 'declined']),
  unresolvedRiskIds: z.array(z.string()),
  acknowledgedRiskIds: z.array(z.string()),
  decidedAt: z.string(),
});
export type WorkOfferDecisionDto = z.infer<typeof workOfferDecisionSchema>;

export const workCvSchema = z.object({
  format: z.enum(['standard_english', 'skills_based', 'trade_one_page', 'europe_oriented']),
  generatedAt: z.string(),
  passportVersion: z.number().int(),
  headline: z.string(),
  summary: z.string(),
  experience: z.array(
    z.object({
      employerName: z.string(),
      occupationKey: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      responsibilities: z.array(z.string()),
      evidenceDocumentIds: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  credentials: z.array(z.object({ title: z.string(), verificationStatus: z.string() })),
  warning: localizedTextSchema,
});
export type WorkCvDto = z.infer<typeof workCvSchema>;

export const recordWorkOutcomeSchema = z.object({
  caseId: z.string(),
  consentGiven: z.literal(true),
  departed: z.boolean().optional(),
  arrived: z.boolean().optional(),
  joinedExpectedEmployer: z.boolean().nullable().optional(),
  occupationMatched: z.boolean().nullable().optional(),
  salaryMatched: z.boolean().nullable().optional(),
  accommodationMatched: z.boolean().nullable().optional(),
  actualMonthlySalary: moneySchema.optional(),
  actualWorkerCost: moneySchema.optional(),
  unexpectedChargeMinorUnits: z.string().regex(/^\d+$/).optional(),
  jobActiveAtDays: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
});
export type RecordWorkOutcomeDto = z.infer<typeof recordWorkOutcomeSchema>;

export const workOutcomeSchema = recordWorkOutcomeSchema.extend({
  id: z.string(),
  userId: z.string(),
  jobId: z.string().optional(),
  observedAt: z.string(),
  reviewStatus: z.literal('pending_human_review'),
});
export type WorkOutcomeDto = z.infer<typeof workOutcomeSchema>;

export const workDashboardSchema = z.object({
  passportVersion: z.number().int(),
  applications: z.array(workApplicationSchema),
  cases: z.array(caseDetailSchema),
  nextActions: z.array(
    z.object({
      caseId: z.string(),
      taskId: z.string(),
      label: localizedTextSchema,
      status: z.string(),
    }),
  ),
  arrivalModeCaseIds: z.array(z.string()),
  rightsNotice: localizedTextSchema,
});
export type WorkDashboardDto = z.infer<typeof workDashboardSchema>;
