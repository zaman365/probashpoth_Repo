import { z } from 'zod';
import { localizedTextSchema, moneySchema, sourceSummarySchema } from './primitives';
import { decisionTraceSchema } from './catalogue';

export const mobilityGoalSchema = z.enum(['WORK', 'STUDY', 'TRAINING', 'EXPLORE']);
export const lifecycleStageSchema = z.enum([
  'DISCOVER',
  'QUALIFY',
  'PREPARE',
  'VERIFY',
  'APPLY',
  'VISA',
  'DEPART',
  'ARRIVE',
  'SETTLE',
  'GROW',
  'RETURN_OR_NEXT_MOVE',
]);
export const coverageMaturitySchema = z.enum([
  'RESEARCH_ONLY',
  'INFORMATION_VERIFIED',
  'ELIGIBILITY_SUPPORTED',
  'JOURNEY_SUPPORTED',
  'PARTNER_SUPPORTED',
  'TRANSACTION_SUPPORTED',
]);
export const bangladeshAccessibilitySchema = z.enum([
  'CONFIRMED_OPEN_TO_BANGLADESH',
  'INTERNATIONAL_SPONSORSHIP_INDICATED',
  'POTENTIALLY_ELIGIBLE',
  'LOCAL_WORK_AUTHORIZATION_REQUIRED',
  'NOT_CONFIRMED',
  'NOT_ELIGIBLE',
]);
export const dataConfidenceSchema = z.enum([
  'VERIFIED',
  'SUPPORTED_BY_OFFICIAL_SOURCE',
  'SUPPORTED_BY_PROVIDER_SOURCE',
  'ESTIMATED',
  'INCOMPLETE_DATA',
  'NEEDS_HUMAN_REVIEW',
]);

export const quickCheckInputSchema = z.object({
  goal: mobilityGoalSchema,
  age: z.number().int().min(15).max(100).optional(),
  citizenship: z.string().length(2).default('BD'),
  residenceCountry: z.string().length(2).default('BD'),
  educationLevel: z.string().optional(),
  occupationKey: z.string().optional(),
  experienceMonths: z.number().int().min(0).optional(),
  languageCertificates: z.array(z.string()).default([]),
  skillCertificates: z.array(z.string()).default([]),
  budget: moneySchema.optional(),
  preferredCountryCodes: z.array(z.string().length(2)).max(10).default([]),
  desiredTimelineMonths: z.number().int().min(1).max(120).optional(),
  hasValidPassport: z.boolean().optional(),
  hasEmployerOffer: z.boolean().optional(),
  degreeSubject: z.string().optional(),
  grade: z.string().optional(),
  desiredStudyLevel: z.string().optional(),
  intake: z.string().optional(),
  scholarshipNeeded: z.boolean().optional(),
});
export type QuickCheckInputDto = z.infer<typeof quickCheckInputSchema>;

export const quickCheckRouteSchema = z.object({
  routeVersionId: z.string(),
  routeId: z.string(),
  title: localizedTextSchema,
  destinationCountry: z.string().length(2),
  goal: mobilityGoalSchema,
  eligibility: decisionTraceSchema,
  fit: z.enum(['STRONG_FIT', 'POSSIBLE_FIT', 'NEEDS_PREPARATION', 'NOT_CURRENTLY_A_FIT']),
  fitReasons: z.array(localizedTextSchema),
  preparationGaps: z.array(localizedTextSchema),
  estimatedPreparation: z
    .object({ minMonths: z.number().int().min(0), maxMonths: z.number().int().min(0) })
    .optional(),
  costRange: z
    .object({ min: moneySchema, max: moneySchema, status: z.enum(['OFFICIAL', 'ESTIMATED']) })
    .optional(),
  timeRange: z
    .object({ minDays: z.number().int().min(0), maxDays: z.number().int().min(0) })
    .optional(),
  coverageMaturity: coverageMaturitySchema,
  bangladeshAccessibility: bangladeshAccessibilitySchema,
  confidence: dataConfidenceSchema,
  sources: z.array(sourceSummarySchema),
  lastVerifiedAt: z.string().optional(),
});

export const quickCheckResultSchema = z.object({
  generatedAt: z.string(),
  accountRequired: z.literal(false),
  routes: z.array(quickCheckRouteSchema),
  disclaimer: localizedTextSchema,
  escalationOffered: z.boolean(),
});
export type QuickCheckResultDto = z.infer<typeof quickCheckResultSchema>;

export const routeCoverageSchema = z.object({
  id: z.string(),
  routeVersionId: z.string(),
  countryCode: z.string().length(2),
  nationalityScope: z.array(z.string()),
  maturity: coverageMaturitySchema,
  officialInformationAvailable: z.boolean(),
  eligibilityEngineAvailable: z.boolean(),
  applicationGuidanceAvailable: z.boolean(),
  verifiedPartnerAvailable: z.boolean(),
  officialFeeDataAvailable: z.boolean(),
  processingTimeDataAvailable: z.boolean(),
  sourceLastVerifiedAt: z.string().optional(),
  coverageOwner: z.string().optional(),
  checklist: z.object({
    officialSourcesMapped: z.boolean(),
    visaRoutesMapped: z.boolean(),
    costsMapped: z.boolean(),
    recognitionMapped: z.boolean(),
    languageMapped: z.boolean(),
    opportunitiesMapped: z.boolean(),
    providerVerificationAvailable: z.boolean(),
    complaintAndEmergencySourcesMapped: z.boolean(),
    arrivalTasksMapped: z.boolean(),
    contentReviewed: z.boolean(),
    legalReviewComplete: z.boolean(),
    dataOwnerAssigned: z.boolean(),
    freshnessSlaConfigured: z.boolean(),
  }),
  updatedAt: z.string(),
});
export type RouteCoverageDto = z.infer<typeof routeCoverageSchema>;

export const officialActionSchema = z.object({
  id: z.string(),
  countryCode: z.string().length(2),
  authority: localizedTextSchema,
  actionType: z.enum([
    'BMET_REGISTRATION',
    'AGENCY_VERIFICATION',
    'VISA_VERIFICATION',
    'EMIGRATION_CLEARANCE',
    'OFFICIAL_COMPLAINT',
    'BOESL_APPLICATION',
    'GOVERNMENT_TRAINING',
    'DESTINATION_VISA_APPLICATION',
    'QUALIFICATION_RECOGNITION',
    'OTHER',
  ]),
  title: localizedTextSchema,
  description: localizedTextSchema,
  officialUrl: z.string().url(),
  officialAppDeeplink: z.string().optional(),
  isExternal: z.literal(true),
  requiresAccount: z.boolean(),
  requiresInPerson: z.boolean(),
  feeType: z.enum(['OFFICIAL', 'FREE', 'VARIES', 'UNKNOWN']),
  officialFee: moneySchema.optional(),
  sourceRecordId: z.string(),
  lastVerifiedAt: z.string().optional(),
  status: z.enum(['ACTIVE', 'TEMPORARILY_UNAVAILABLE', 'RETIRED', 'NEEDS_REVIEW']),
  preparationRequirementIds: z.array(z.string()),
  legalReviewRequired: z.boolean(),
});
export type OfficialActionDto = z.infer<typeof officialActionSchema>;

export const confirmOfficialActionSchema = z.object({
  actionId: z.string(),
  caseId: z.string().optional(),
  event: z.enum(['HANDED_OFF', 'USER_CONFIRMED_COMPLETE']),
});
export type ConfirmOfficialActionDto = z.infer<typeof confirmOfficialActionSchema>;

export const officialActionCompletionSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  userId: z.string(),
  caseId: z.string().optional(),
  status: z.enum([
    'NOT_STARTED',
    'HANDED_OFF',
    'USER_CONFIRMED_COMPLETE',
    'AUTHORIZED_SYNC_COMPLETE',
  ]),
  handedOffAt: z.string().optional(),
  userConfirmedAt: z.string().optional(),
  authorizedExternalReference: z.string().optional(),
  statusProvenance: z.enum(['USER_CONFIRMED', 'AUTHORIZED_CONNECTOR', 'NONE']),
  updatedAt: z.string(),
});
export type OfficialActionCompletionDto = z.infer<typeof officialActionCompletionSchema>;

export const applicationQaInputSchema = z.object({
  applicationId: z.string(),
  profileComplete: z.boolean(),
  mandatoryDocumentsPresent: z.boolean(),
  documentsNotExpired: z.boolean(),
  eligibilityChecked: z.boolean(),
  unresolvedContradictions: z.boolean(),
  duplicateApplication: z.boolean(),
  costDisclosureViewed: z.boolean(),
  providerIdentityChecked: z.boolean(),
  submissionSnapshotReviewed: z.boolean(),
  applicantApproved: z.boolean(),
  profileVersion: z.number().int().min(1),
  documentIds: z.array(z.string()),
  renderedSummary: localizedTextSchema,
  applicationPayloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  costDisclosureIds: z.array(z.string()),
  providerVerificationEvidenceIds: z.array(z.string()),
  assistedByUserId: z.string().optional(),
});
export type ApplicationQaInputDto = z.infer<typeof applicationQaInputSchema>;

export const applicationQaResultSchema = z.object({
  reviewId: z.string(),
  snapshotId: z.string(),
  status: z.enum([
    'DRAFT',
    'PROFILE_INCOMPLETE',
    'DOCS_INCOMPLETE',
    'ELIGIBILITY_REVIEW',
    'QA_REVIEW',
    'USER_APPROVAL_REQUIRED',
    'READY_TO_SUBMIT',
    'SUBMITTED',
    'PROVIDER_REVIEW',
    'ACTION_REQUIRED',
    'OFFERED',
    'REJECTED',
    'WITHDRAWN',
    'CLOSED',
  ]),
  checks: z.array(z.object({ key: z.string(), passed: z.boolean() })),
  blockers: z.array(z.string()),
  readyToSubmit: z.boolean(),
  immutableSnapshotCreated: z.literal(true),
});
export type ApplicationQaResultDto = z.infer<typeof applicationQaResultSchema>;

export const mobilityRoiInputSchema = z.object({
  currency: z.string().length(3),
  upfrontCosts: z.array(moneySchema),
  officialCosts: z.array(moneySchema),
  optionalCosts: z.array(moneySchema),
  savingsAvailable: moneySchema,
  borrowedAmount: moneySchema,
  annualInterestBasisPoints: z.number().int().min(0).max(10000).optional(),
  repaymentMonths: z.number().int().min(1).max(360).optional(),
  monthlyNetIncomeRange: z.object({ min: moneySchema, max: moneySchema }),
  monthlyLivingCostRange: z.object({ min: moneySchema, max: moneySchema }),
  remittanceGoal: moneySchema.optional(),
  assumptions: z.array(localizedTextSchema),
  sourceIds: z.array(z.string()),
  confidence: dataConfidenceSchema,
});
export type MobilityRoiInputDto = z.infer<typeof mobilityRoiInputSchema>;

export const mobilityRoiResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  caseId: z.string().optional(),
  calculatedAt: z.string(),
  currency: z.string().length(3),
  totalUpfrontCost: moneySchema,
  officialCost: moneySchema,
  optionalCost: moneySchema,
  debtNeeded: moneySchema,
  monthlySavingsRange: z.object({ min: moneySchema, max: moneySchema }),
  breakEvenMonthsRange: z.object({
    min: z.number().int().nullable(),
    max: z.number().int().nullable(),
  }),
  estimatedMonthlyDebtService: moneySchema.optional(),
  debtServiceShareOfSavingsPercent: z
    .object({ min: z.number().nullable(), max: z.number().nullable() })
    .optional(),
  debtRisk: z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'UNKNOWN']),
  warnings: z.array(z.string()),
  assumptions: z.array(localizedTextSchema),
  sourceIds: z.array(z.string()),
  confidence: dataConfidenceSchema,
  informationalOnly: z.literal(true),
});
export type MobilityRoiResultDto = z.infer<typeof mobilityRoiResultSchema>;

export const universalDeadlineInputSchema = z.object({
  caseId: z.string().optional(),
  opportunityId: z.string().optional(),
  entityType: z.string(),
  entityId: z.string(),
  kind: z.enum([
    'SCHOLARSHIP',
    'UNIVERSITY',
    'JOB',
    'APPLICATION',
    'VISA',
    'BIOMETRICS',
    'MEDICAL',
    'TRAINING',
    'LANGUAGE_EXAM',
    'DOCUMENT_EXPIRY',
    'CONTRACT',
    'DEPARTURE',
    'ARRIVAL',
    'RESIDENCE_RENEWAL',
  ]),
  title: localizedTextSchema,
  dueAt: z.string().datetime(),
  timezone: z.string(),
  hardness: z.enum(['HARD', 'SOFT']),
  reminderOffsetsMinutes: z.array(z.number().int().positive()).max(10),
  sourceIds: z.array(z.string()),
});
export type UniversalDeadlineInputDto = z.infer<typeof universalDeadlineInputSchema>;
export const universalDeadlineSchema = universalDeadlineInputSchema.extend({
  id: z.string(),
  ownerUserId: z.string().optional(),
  completedAt: z.string().optional(),
  changedFromDeadlineId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UniversalDeadlineDto = z.infer<typeof universalDeadlineSchema>;

export const savedItemInputSchema = z.object({
  itemType: z.enum([
    'PROGRAM',
    'JOB',
    'EMPLOYER',
    'INSTITUTION',
    'PATHWAY',
    'SCHOLARSHIP',
    'TRAINING',
    'PROVIDER',
  ]),
  itemId: z.string(),
  state: z.enum(['SAVED', 'SHORTLISTED', 'DISMISSED']).default('SAVED'),
  compare: z.boolean().default(false),
  note: z.string().max(1000).optional(),
  delegateShareIds: z.array(z.string()).default([]),
  alertPreference: z.enum(['NONE', 'DEADLINES', 'ALL_UPDATES']).default('DEADLINES'),
});
export type SavedItemInputDto = z.infer<typeof savedItemInputSchema>;
export const savedItemSchema = savedItemInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedItemDto = z.infer<typeof savedItemSchema>;

export const feeCheckInputSchema = z.object({
  countryCode: z.string().length(2),
  routeVersionId: z.string(),
  agencyId: z.string().optional(),
  quotedAmount: moneySchema,
  breakdown: z.array(z.object({ label: z.string(), amount: moneySchema })).default([]),
});
export type FeeCheckInputDto = z.infer<typeof feeCheckInputSchema>;
export const feeCheckResultSchema = z.object({
  officialKnownCosts: z.array(
    z.object({ label: localizedTextSchema, amount: moneySchema, sourceIds: z.array(z.string()) }),
  ),
  providerDisclosedCosts: z.array(
    z.object({
      label: localizedTextSchema,
      amount: moneySchema.optional(),
      sourceIds: z.array(z.string()),
    }),
  ),
  quotedAmount: moneySchema,
  unexplainedDifference: moneySchema.optional(),
  warnings: z.array(localizedTextSchema),
  questionsToAsk: z.array(localizedTextSchema),
  officialActions: z.array(officialActionSchema),
  confidence: dataConfidenceSchema,
});
export type FeeCheckResultDto = z.infer<typeof feeCheckResultSchema>;

export const structuredOfferCheckInputSchema = z.object({
  kind: z.enum(['JOB_OFFER', 'CONTRACT']).default('JOB_OFFER'),
  publicJobId: z.string().optional(),
  employerName: z.string().optional(),
  recruiterName: z.string().optional(),
  jobTitle: z.string().optional(),
  salary: moneySchema.optional(),
  expectedSalary: moneySchema.optional(),
  location: z.string().optional(),
  visaRoute: z.string().optional(),
  feeRequested: moneySchema.optional(),
  contactDomain: z.string().optional(),
  hasAllPages: z.boolean().optional(),
  hasSignature: z.boolean().optional(),
  contractLanguageUnderstood: z.boolean().optional(),
  sourceIds: z.array(z.string()).default([]),
});
export type StructuredOfferCheckInputDto = z.infer<typeof structuredOfferCheckInputSchema>;
export const structuredOfferCheckResultSchema = z.object({
  kind: z.enum(['JOB_OFFER', 'CONTRACT']),
  verifiedFacts: z.array(localizedTextSchema),
  unverifiedFacts: z.array(localizedTextSchema),
  warnings: z.array(localizedTextSchema),
  criticalMismatches: z.array(localizedTextSchema),
  questionsToAsk: z.array(localizedTextSchema),
  officialActions: z.array(officialActionSchema),
  confidence: dataConfidenceSchema,
  conclusiveFraudFinding: z.literal(false),
  humanReviewOffered: z.boolean(),
});
export type StructuredOfferCheckResultDto = z.infer<typeof structuredOfferCheckResultSchema>;

export const agencyCheckInputSchema = z
  .object({
    agencyName: z.string().optional(),
    licenceNumber: z.string().optional(),
    phone: z.string().optional(),
    office: z.string().optional(),
    urlOrSocial: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.agencyName || value.licenceNumber || value.phone || value.urlOrSocial),
    {
      message: 'Provide at least one agency identifier',
    },
  );
export type AgencyCheckInputDto = z.infer<typeof agencyCheckInputSchema>;
export const agencyCheckResultSchema = z.object({
  status: z.enum([
    'VERIFIED',
    'COULD_NOT_VERIFY',
    'INFORMATION_DIFFERS',
    'LICENSE_EXPIRED',
    'NEEDS_MANUAL_REVIEW',
  ]),
  officialName: localizedTextSchema.optional(),
  officialAddress: localizedTextSchema.optional(),
  licenceNumber: z.string().optional(),
  licenceStatus: z.string().optional(),
  validTo: z.string().optional(),
  mismatchWarnings: z.array(localizedTextSchema),
  sources: z.array(sourceSummarySchema),
  lastVerifiedAt: z.string().optional(),
  conclusiveFraudFinding: z.literal(false),
});
export type AgencyCheckResultDto = z.infer<typeof agencyCheckResultSchema>;

export const trustCenterSchema = z.object({
  verificationStatuses: z.array(z.string()),
  providerCategories: z.array(z.string()),
  sections: z.array(
    z.object({ key: z.string(), title: localizedTextSchema, body: localizedTextSchema }),
  ),
  recommendationNeutrality: z.object({
    organicRankingUsesCommission: z.literal(false),
    sponsoredSeparated: z.literal(true),
    partnerRelationshipDisclosed: z.literal(true),
  }),
  safetyBasicsPaywalled: z.literal(false),
  lastReviewedAt: z.string(),
});
export type TrustCenterDto = z.infer<typeof trustCenterSchema>;

export const freshnessDashboardSchema = z.object({
  generatedAt: z.string(),
  totals: z.object({
    fresh: z.number(),
    ageing: z.number(),
    stale: z.number(),
    unknown: z.number(),
  }),
  items: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      countryCode: z.string().optional(),
      state: z.enum(['fresh', 'ageing', 'stale', 'unknown']),
      lastVerifiedAt: z.string().optional(),
      nextReviewDueAt: z.string().optional(),
      brokenOfficialLink: z.boolean(),
      pendingHumanReview: z.boolean(),
    }),
  ),
});
export type FreshnessDashboardDto = z.infer<typeof freshnessDashboardSchema>;

export const copilotQuestionSchema = z.object({
  question: z.string().min(2).max(2000),
  caseId: z.string().optional(),
  routeVersionId: z.string().optional(),
  locale: z.enum(['bn-BD', 'en']).default('bn-BD'),
});
export type CopilotQuestionDto = z.infer<typeof copilotQuestionSchema>;
export const copilotAnswerSchema = z.object({
  answer: localizedTextSchema,
  confidence: dataConfidenceSchema,
  sourceIds: z.array(z.string()),
  officialActions: z.array(officialActionSchema),
  generatedAt: z.string(),
  canonicalStateChanged: z.literal(false),
  escalationOffered: z.boolean(),
});
export type CopilotAnswerDto = z.infer<typeof copilotAnswerSchema>;

/** P1/P2 registry: every deferred capability has an honest state and legal gate. */
export const capabilityRegistryItemSchema = z.object({
  key: z.string(),
  priority: z.enum(['P1', 'P2']),
  status: z.enum([
    'FOUNDATION_AVAILABLE',
    'LEGAL_REVIEW_REQUIRED',
    'EXTERNAL_DEPENDENCY',
    'PILOT_ONLY',
  ]),
  title: localizedTextSchema,
  safeguards: z.array(localizedTextSchema),
  live: z.boolean(),
});
export type CapabilityRegistryItemDto = z.infer<typeof capabilityRegistryItemSchema>;
