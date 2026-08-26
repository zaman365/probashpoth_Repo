import { z } from 'zod';
import {
  localizedTextSchema,
  moneySchema,
  sourceSummarySchema,
  verificationSummarySchema,
} from './primitives';

/** §7 — countries carry an operational support status, never a bare list. */
export const countrySummarySchema = z.object({
  code: z.string().length(2),
  name: localizedTextSchema,
  supportStatus: z.string(),
  workPriorityTier: z.string(),
  isStudyPriority: z.boolean(),
  statusNotice: localizedTextSchema.optional(),
  routeCount: z.number().int().min(0),
});
export type CountrySummaryDto = z.infer<typeof countrySummarySchema>;

export const requirementSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: localizedTextSchema,
  description: localizedTextSchema.optional(),
  mandatory: z.boolean(),
  estimatedDays: z.number().int().optional(),
  performedAt: localizedTextSchema.optional(),
  sourceIds: z.array(z.string()).default([]),
});

export const riskNoticeSchema = z.object({
  id: z.string(),
  severity: z.enum(['info', 'caution', 'warning', 'severe']),
  title: localizedTextSchema,
  body: localizedTextSchema,
  sourceIds: z.array(z.string()).default([]),
});

export const routeSummarySchema = z.object({
  id: z.string(),
  routeId: z.string(),
  version: z.number().int(),
  purpose: z.string(),
  destinationCountry: z.string().length(2),
  officialName: localizedTextSchema,
  summary: localizedTextSchema,
  status: z.string(),
  acceptsApplications: z.boolean(),
  expectedTimeline: z.object({ minDays: z.number(), maxDays: z.number() }).optional(),
  lastReviewedAt: z.string().optional(),
  freshness: z.enum(['fresh', 'ageing', 'stale', 'unknown']),
});
export type RouteSummaryDto = z.infer<typeof routeSummarySchema>;

export const routeDetailSchema = routeSummarySchema.extend({
  visaClass: z.string().optional(),
  permitClass: z.string().optional(),
  requirements: z.array(requirementSchema),
  postArrivalObligations: z.array(requirementSchema),
  riskNotices: z.array(riskNoticeSchema),
  workRightsNote: localizedTextSchema.optional(),
  studyRightsNote: localizedTextSchema.optional(),
  dependantsNote: localizedTextSchema.optional(),
  permanentPathwayNotes: localizedTextSchema.optional(),
  sources: z.array(sourceSummarySchema),
  effectiveFrom: z.string(),
  verifiedAt: z.string(),
  publicationStatus: z.string(),
});
export type RouteDetailDto = z.infer<typeof routeDetailSchema>;

export const occupationSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  family: z.string(),
  title: localizedTextSchema,
  iscoCode: z.string(),
  skillLevel: z.number().int(),
});
export type OccupationSummaryDto = z.infer<typeof occupationSummarySchema>;

/** §19 — eligibility answers are one of four states; a score is never shown. */
export const decisionTraceSchema = z.object({
  result: z.enum(['eligible', 'ineligible', 'conditional', 'unknown']),
  ruleVersionIds: z.array(z.string()),
  satisfied: z.array(
    z.object({
      nodeId: z.string(),
      label: localizedTextSchema,
      outcome: z.string(),
      sourceIds: z.array(z.string()).default([]),
    }),
  ),
  unsatisfied: z.array(
    z.object({
      nodeId: z.string(),
      label: localizedTextSchema,
      outcome: z.string(),
      remediable: z.boolean().optional(),
      preparation: localizedTextSchema.optional(),
      sourceIds: z.array(z.string()).default([]),
    }),
  ),
  remediable: z.array(
    z.object({
      nodeId: z.string(),
      label: localizedTextSchema,
      preparation: localizedTextSchema.optional(),
    }),
  ),
  missingFacts: z.array(
    z.object({ factKey: z.string(), nodeId: z.string(), label: localizedTextSchema }),
  ),
  sources: z.array(z.object({ sourceId: z.string(), locator: z.string().optional() })),
  evaluatedAt: z.string(),
});
export type DecisionTraceDto = z.infer<typeof decisionTraceSchema>;

export const evaluateEligibilitySchema = z.object({
  routeVersionId: z.string(),
  /** Optional overrides for a what-if check; the stored profile supplies the rest. */
  facts: z
    .object({
      ageYears: z.number().int().optional(),
      occupationKey: z.string().optional(),
      experienceMonths: z.number().int().optional(),
      educationLevel: z.string().optional(),
      hasValidPassport: z.boolean().optional(),
      languageCertificates: z.array(z.string()).optional(),
      skillCertificates: z.array(z.string()).optional(),
      hasEmployerOffer: z.boolean().optional(),
    })
    .optional(),
});
export type EvaluateEligibilityDto = z.infer<typeof evaluateEligibilitySchema>;

export const eligibilityResponseSchema = z.object({
  routeVersionId: z.string(),
  trace: decisionTraceSchema,
  sources: z.array(sourceSummarySchema),
  /** §19/§41 — human review is offered whenever the answer is unknown. */
  humanReviewOffered: z.boolean(),
});
export type EligibilityResponseDto = z.infer<typeof eligibilityResponseSchema>;

export const jobSummarySchema = z.object({
  id: z.string(),
  publicId: z.string(),
  title: localizedTextSchema,
  destinationCountry: z.string().length(2),
  occupationKey: z.string(),
  monthlySalary: moneySchema,
  positions: z.number().int(),
  employerName: localizedTextSchema,
  agencyName: localizedTextSchema.optional(),
  verificationLevel: z.string(),
  allowedWorkerCost: moneySchema,
  recruitmentFeePaidBy: z.string(),
  demandValidTo: z.string(),
  isSyntheticDemoData: z.boolean(),
});
export type JobSummaryDto = z.infer<typeof jobSummarySchema>;

export const jobDetailSchema = jobSummarySchema.extend({
  description: localizedTextSchema,
  routeVersionId: z.string(),
  terms: z.object({
    monthlySalary: moneySchema,
    overtimePolicy: localizedTextSchema,
    workingHoursPerWeek: z.number(),
    contractDurationMonths: z.number(),
    probationMonths: z.number().optional(),
    accommodationProvided: z.boolean(),
    foodProvided: z.boolean(),
    transportProvided: z.boolean(),
    insuranceProvided: z.boolean(),
    annualLeaveDays: z.number(),
    airfarePaidBy: z.string(),
    recruitmentFeePaidBy: z.string(),
    workPermitPaidBy: z.string(),
    cancellationTerms: localizedTextSchema,
  }),
  verification: verificationSummarySchema,
  agencyLicence: z
    .object({ number: z.string(), status: z.string(), validTo: z.string().optional() })
    .optional(),
  sources: z.array(sourceSummarySchema),
});
export type JobDetailDto = z.infer<typeof jobDetailSchema>;

/** §21 — the public verification page. No PII, ever. */
export const publicJobVerificationSchema = z.object({
  publicId: z.string(),
  status: z.enum(['verified', 'suspended', 'expired', 'not_found']),
  employerName: localizedTextSchema.optional(),
  agencyName: localizedTextSchema.optional(),
  agencyLicence: z
    .object({ number: z.string(), status: z.string(), validTo: z.string().optional() })
    .optional(),
  occupation: localizedTextSchema.optional(),
  destinationCountry: z.string().length(2).optional(),
  monthlySalary: moneySchema.optional(),
  allowedWorkerCost: moneySchema.optional(),
  demandValidTo: z.string().optional(),
  verification: verificationSummarySchema.optional(),
  lastVerifiedAt: z.string().optional(),
  isSyntheticDemoData: z.boolean().optional(),
  qrPayload: z.string().optional(),
});
export type PublicJobVerificationDto = z.infer<typeof publicJobVerificationSchema>;

export const verifyQrSchema = z.object({ token: z.string().min(8) });
export type VerifyQrDto = z.infer<typeof verifyQrSchema>;
