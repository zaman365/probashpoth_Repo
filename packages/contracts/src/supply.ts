import { z } from 'zod';
import { localizedTextSchema, moneySchema } from './primitives';

/** Blueprint §87–§92/§122 — partner monetisation never changes trust or ranking. */
export const partnerPortalKindSchema = z.enum(['employer', 'recruiter', 'institution', 'provider']);
export type PartnerPortalKindDto = z.infer<typeof partnerPortalKindSchema>;

export const partnerSubmissionKindSchema = z.enum([
  'employer_job_order',
  'recruiter_job_order',
  'institution_program',
  'provider_service',
]);

export const createPartnerSubmissionSchema = z.object({
  kind: partnerSubmissionKindSchema,
  title: localizedTextSchema,
  countryCode: z.string().length(2),
  sourceIds: z.array(z.string()).min(1),
  payload: z.record(z.string(), z.unknown()),
  safetyAttestations: z.object({
    noGuaranteedOutcome: z.literal(true),
    feesDeclared: z.literal(true),
    dataUseConsent: z.literal(true),
    officialAuthorityNotImplied: z.literal(true),
  }),
  promotionDisclosure: z
    .object({
      paid: z.boolean(),
      label: localizedTextSchema,
    })
    .optional(),
});
export type CreatePartnerSubmissionDto = z.infer<typeof createPartnerSubmissionSchema>;

export const partnerSubmissionSchema = createPartnerSubmissionSchema.extend({
  id: z.string(),
  organizationId: z.string(),
  createdByUserId: z.string(),
  status: z.enum(['draft', 'in_review', 'approved', 'rejected', 'suspended']),
  verificationLevel: z.enum(['unverified', 'evidence_submitted', 'human_verified']),
  organicRankInfluencedByPayment: z.literal(false),
  publicationChangeId: z.string().optional(),
  reviewNote: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PartnerSubmissionDto = z.infer<typeof partnerSubmissionSchema>;

export const declarePartnerFeeSchema = z.object({
  submissionId: z.string().optional(),
  category: z.string().min(2).max(120),
  label: localizedTextSchema,
  amount: moneySchema.nullable(),
  amountStatus: z.enum(['known', 'unknown']),
  chargedTo: z.enum(['worker', 'student', 'employer', 'institution', 'shared']),
  legalStatus: z.enum(['declared', 'verified_allowed', 'verified_prohibited', 'unknown']),
  refundable: z.boolean().nullable(),
  receiptRequired: z.boolean(),
  sourceIds: z.array(z.string()).default([]),
});
export type DeclarePartnerFeeDto = z.infer<typeof declarePartnerFeeSchema>;

export const partnerFeeDeclarationSchema = declarePartnerFeeSchema.extend({
  id: z.string(),
  organizationId: z.string(),
  declaredByUserId: z.string(),
  verificationStatus: z.enum(['pending_human_review', 'verified', 'rejected']),
  createdAt: z.string(),
});
export type PartnerFeeDeclarationDto = z.infer<typeof partnerFeeDeclarationSchema>;

export const grantPartnerAccessSchema = z.object({
  applicationType: z.enum(['work', 'study']),
  applicationId: z.string(),
  organizationId: z.string(),
  consentGiven: z.literal(true),
});
export type GrantPartnerAccessDto = z.infer<typeof grantPartnerAccessSchema>;

export const partnerAccessGrantSchema = grantPartnerAccessSchema.extend({
  id: z.string(),
  userId: z.string(),
  consentId: z.string(),
  grantedAt: z.string(),
  revokedAt: z.string().optional(),
});
export type PartnerAccessGrantDto = z.infer<typeof partnerAccessGrantSchema>;

/** Deliberately pseudonymous: no name, phone, passport, exact age or document bytes. */
export const partnerCandidateSchema = z.object({
  pseudonymousCandidateRef: z.string(),
  path: z.enum(['work', 'study']),
  applicationId: z.string(),
  caseId: z.string(),
  opportunityId: z.string(),
  status: z.string(),
  readinessBand: z.enum(['early', 'preparing', 'ready']),
  evidenceCoveragePercent: z.number().int().min(0).max(100),
  sharedByExplicitConsent: z.literal(true),
  grantedAt: z.string(),
});
export type PartnerCandidateDto = z.infer<typeof partnerCandidateSchema>;

export const updatePartnerPipelineSchema = z.object({
  applicationType: z.enum(['work', 'study']),
  action: z.enum([
    'screen',
    'invite_interview',
    'record_offer',
    'reject',
    'withdraw_offer',
    'record_enrolment',
  ]),
  note: z.string().min(3).max(2000),
});
export type UpdatePartnerPipelineDto = z.infer<typeof updatePartnerPipelineSchema>;

export const partnerPipelineEventSchema = updatePartnerPipelineSchema.extend({
  id: z.string(),
  applicationId: z.string(),
  organizationId: z.string(),
  actorUserId: z.string(),
  occurredAt: z.string(),
});
export type PartnerPipelineEventDto = z.infer<typeof partnerPipelineEventSchema>;

export const partnerAnalyticsSchema = z.object({
  organizationId: z.string(),
  minimumCohortSize: z.literal(5),
  cohortSize: z.number().int().min(0),
  suppressed: z.boolean(),
  metrics: z
    .object({
      applications: z.number().int().min(0),
      reviewedOutcomes: z.number().int().min(0),
      promisedTermsMatchedPercent: z.number().min(0).max(100).nullable(),
      upheldComplaintCount: z.number().int().min(0),
    })
    .nullable(),
  note: localizedTextSchema,
});
export type PartnerAnalyticsDto = z.infer<typeof partnerAnalyticsSchema>;

export const partnerPortalDashboardSchema = z.object({
  portalKind: partnerPortalKindSchema,
  organizationId: z.string(),
  organizationName: localizedTextSchema,
  verificationStatus: z.string(),
  submissions: z.array(partnerSubmissionSchema),
  feeDeclarations: z.array(partnerFeeDeclarationSchema),
  candidates: z.array(partnerCandidateSchema),
  analytics: partnerAnalyticsSchema,
  governanceNotice: localizedTextSchema,
});
export type PartnerPortalDashboardDto = z.infer<typeof partnerPortalDashboardSchema>;
