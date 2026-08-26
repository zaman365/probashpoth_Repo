import { z } from 'zod';
import { localizedTextSchema, sourceSummarySchema } from './primitives';

export const complaintCategorySchema = z.enum([
  'fake_job',
  'fake_recruiter',
  'fake_employer',
  'fake_visa',
  'excess_fee',
  'salary_substitution',
  'contract_substitution',
  'private_payment',
  'fake_government_card',
  'fake_institution',
  'fake_admission',
  'fake_scholarship',
  'fake_education_agent',
  'fake_tuition_request',
  'cloned_domain',
  'fake_visa_appointment',
  'fake_blocked_account',
  'service_quality',
  'refund_dispute',
  'worker_rights',
  'other',
]);

export const createComplaintSchema = z.object({
  path: z.enum(['work', 'study', 'shared']),
  category: complaintCategorySchema,
  caseId: z.string().optional(),
  organizationId: z.string().optional(),
  jobId: z.string().optional(),
  programId: z.string().optional(),
  summary: z.string().min(10).max(4000),
  evidenceDocumentIds: z.array(z.string()).default([]),
  urgentSafetyRisk: z.boolean().default(false),
});
export type CreateComplaintDto = z.infer<typeof createComplaintSchema>;

export const complaintEventSchema = z.object({
  id: z.string(),
  complaintId: z.string(),
  type: z.enum([
    'submitted',
    'evidence_added',
    'triaged',
    'organization_response',
    'reviewed',
    'escalated',
    'resolved',
    'refund_recorded',
    'remedy_recorded',
    'outcome_recorded',
  ]),
  actorUserId: z.string(),
  note: z.string().max(4000).optional(),
  evidenceDocumentIds: z.array(z.string()).default([]),
  occurredAt: z.string(),
});
export type ComplaintEventDto = z.infer<typeof complaintEventSchema>;

export const complaintSchema = createComplaintSchema.extend({
  id: z.string(),
  complainantUserId: z.string(),
  status: z.enum([
    'submitted',
    'evidence',
    'triage',
    'organization_response',
    'review',
    'resolved',
    'dismissed',
  ]),
  safetyState: z.enum([
    'reported',
    'reviewing',
    'corroborated',
    'verified',
    'resolved',
    'dismissed',
  ]),
  priority: z.enum(['normal', 'high', 'critical']),
  assignedToUserId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  events: z.array(complaintEventSchema),
});
export type ComplaintDto = z.infer<typeof complaintSchema>;

export const updateComplaintSchema = z.object({
  action: z.enum([
    'add_evidence',
    'triage',
    'request_organization_response',
    'record_organization_response',
    'escalate',
    'review',
    'resolve',
    'dismiss',
    'record_refund',
    'record_remedy',
  ]),
  note: z.string().max(4000).optional(),
  evidenceDocumentIds: z.array(z.string()).default([]),
  safetyState: z
    .enum(['reviewing', 'corroborated', 'verified', 'resolved', 'dismissed'])
    .optional(),
});
export type UpdateComplaintDto = z.infer<typeof updateComplaintSchema>;

export const createHumanReviewSchema = z.object({
  type: z.enum([
    'migration_route',
    'work_contract',
    'study_admission',
    'cost_dispute',
    'document_verification',
    'scholarship',
    'complaint',
    'rule_conflict',
  ]),
  resourceType: z.string(),
  resourceId: z.string(),
  caseId: z.string().optional(),
  question: z.string().min(10).max(4000),
  evidenceDocumentIds: z.array(z.string()).default([]),
  priority: z.enum(['normal', 'high', 'critical']).default('normal'),
});
export type CreateHumanReviewDto = z.infer<typeof createHumanReviewSchema>;

export const humanReviewSchema = createHumanReviewSchema.extend({
  id: z.string(),
  requesterUserId: z.string(),
  status: z.enum(['queued', 'assigned', 'decided', 'cancelled']),
  assignedToUserId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HumanReviewDto = z.infer<typeof humanReviewSchema>;

export const decideHumanReviewSchema = z.object({
  outcome: z.enum(['confirmed', 'not_confirmed', 'needs_more_evidence', 'conflict_escalated']),
  explanation: z.string().min(10).max(4000),
  sourceIds: z.array(z.string()).default([]),
  evidenceDocumentIds: z.array(z.string()).default([]),
});
export type DecideHumanReviewDto = z.infer<typeof decideHumanReviewSchema>;

export const humanReviewDecisionSchema = decideHumanReviewSchema.extend({
  id: z.string(),
  reviewId: z.string(),
  reviewerUserId: z.string(),
  decidedAt: z.string(),
  changesOfficialRule: z.literal(false),
});
export type HumanReviewDecisionDto = z.infer<typeof humanReviewDecisionSchema>;

export const createPublicationChangeSchema = z.object({
  resourceType: z.enum(['route', 'rule', 'job', 'institution', 'program', 'provider', 'source']),
  resourceId: z.string(),
  summary: z.string().min(10).max(4000),
  sourceIds: z.array(z.string()).min(1),
  riskLevel: z.enum(['low', 'medium', 'high']),
});
export type CreatePublicationChangeDto = z.infer<typeof createPublicationChangeSchema>;

export const publicationChangeSchema = createPublicationChangeSchema.extend({
  id: z.string(),
  createdByUserId: z.string(),
  status: z.enum(['draft', 'in_review', 'approved', 'rejected']),
  submittedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewedByUserId: z.string().optional(),
  reviewNote: z.string().optional(),
  createdAt: z.string(),
});
export type PublicationChangeDto = z.infer<typeof publicationChangeSchema>;

export const reviewPublicationChangeSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().min(10).max(4000),
});
export type ReviewPublicationChangeDto = z.infer<typeof reviewPublicationChangeSchema>;

export const serviceDirectoryEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  legalName: localizedTextSchema,
  countryCode: z.string().length(2),
  officialStatus: z.enum(['verified', 'partially_verified', 'unverified', 'suspended']),
  officialDomain: z.string().optional(),
  officialContact: z.object({ email: z.string().optional() }),
  services: z.array(localizedTextSchema),
  licences: z.array(
    z.object({ number: z.string(), status: z.string(), validTo: z.string().optional() }),
  ),
  complaintCount: z.number().int().min(0),
  publishedSafetyIncidentCount: z.number().int().min(0),
  outcomeCount: z.number().int().min(0),
  sources: z.array(sourceSummarySchema),
  lastVerifiedAt: z.string().optional(),
  isSyntheticDemoData: z.boolean(),
});
export type ServiceDirectoryEntryDto = z.infer<typeof serviceDirectoryEntrySchema>;
