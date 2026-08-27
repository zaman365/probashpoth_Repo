import { z } from 'zod';
import { localizedTextSchema, moneySchema } from './primitives';

export const createCaseSchema = z.object({
  routeVersionId: z.string(),
  jobId: z.string().optional(),
  purpose: z.enum(['work', 'study']).default('work'),
});
export type CreateCaseDto = z.infer<typeof createCaseSchema>;

export const caseTaskSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: localizedTextSchema,
  whyNeeded: localizedTextSchema,
  owner: z.string(),
  mandatory: z.boolean(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'not_applicable']),
  estimatedDays: z.number().int().optional(),
  performedAt: localizedTextSchema.optional(),
  dependsOnTaskIds: z.array(z.string()).default([]),
  costItemIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  listenKey: z.string().optional(),
});
export type CaseTaskDto = z.infer<typeof caseTaskSchema>;

export const caseMilestoneSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: localizedTextSchema,
  status: z.enum(['pending', 'evidence_submitted', 'verified', 'failed', 'skipped']),
  attestableBy: z.array(z.string()),
  evidenceDocumentIds: z.array(z.string()).default([]),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
});
export type CaseMilestoneDto = z.infer<typeof caseMilestoneSchema>;

export const caseDetailSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  state: z.string(),
  purpose: z.string(),
  routeVersionId: z.string(),
  jobId: z.string().optional(),
  destinationCountry: z.string().length(2),
  createdAt: z.string(),
  updatedAt: z.string(),
  tasks: z.array(caseTaskSchema),
  milestones: z.array(caseMilestoneSchema),
  nextStates: z.array(z.string()),
  documentIds: z.array(z.string()).default([]),
});
export type CaseDetailDto = z.infer<typeof caseDetailSchema>;

export const caseActionSchema = z.object({
  action: z.enum([
    'advance',
    'complete_task',
    'submit_milestone_evidence',
    'verify_milestone',
    'withdraw',
  ]),
  taskId: z.string().optional(),
  milestoneKey: z.string().optional(),
  evidenceDocumentIds: z.array(z.string()).optional(),
  targetState: z.string().optional(),
  reason: z.string().optional(),
});
export type CaseActionDto = z.infer<typeof caseActionSchema>;

/** §24 — every line item names payer, payee, legal basis and refundability. */
export const costItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  label: localizedTextSchema,
  amount: moneySchema,
  payer: z.object({
    kind: z.string(),
    id: z.string().optional(),
    name: localizedTextSchema.optional(),
  }),
  payee: z.object({
    kind: z.string(),
    id: z.string().optional(),
    name: localizedTextSchema.optional(),
  }),
  legallyAllowed: z.boolean().nullable(),
  legalBasisSourceId: z.string().optional(),
  refundable: z.boolean(),
  mandatory: z.boolean(),
  receiptRequired: z.boolean(),
  milestoneId: z.string().optional(),
  status: z.string(),
  sourceIds: z.array(z.string()).default([]),
});
export type CostItemDto = z.infer<typeof costItemSchema>;

export const costTotalsSchema = z.object({
  workerPaid: moneySchema,
  employerPaid: moneySchema,
  institutionOrScholarshipPaid: moneySchema,
  refundable: moneySchema,
  nonRefundable: moneySchema,
  contingent: moneySchema,
  alreadyPaid: moneySchema,
  remaining: moneySchema,
});

export const costPlanSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  primaryCurrency: z.string().length(3),
  items: z.array(costItemSchema),
  /** One block per currency: amounts are never merged without a rate source (§16). */
  totals: z.array(z.object({ currency: z.string().length(3), totals: costTotalsSchema })),
  unresolvedItemIds: z.array(z.string()).default([]),
  generatedAt: z.string(),
});
export type CostPlanDto = z.infer<typeof costPlanSchema>;

export const createDelegationSchema = z.object({
  delegatePhone: z.string(),
  delegateName: z.string().optional(),
  relationship: z.enum(['spouse', 'parent', 'sibling', 'child', 'trusted_person']),
  permissions: z
    .array(
      z.enum([
        'view_progress',
        'view_cost',
        'receive_payment_alerts',
        'receive_status_alerts',
        'contact_support',
        'emergency_access',
        'approve_high_value_payment',
        'view_contract_summary',
        'upload_documents',
        'join_session',
        'view_documents',
        'edit_profile_draft',
        'approve_submission',
        'view_messages',
      ]),
    )
    .min(1),
});
export type CreateDelegationDto = z.infer<typeof createDelegationSchema>;

export const delegationSchema = z.object({
  id: z.string(),
  principalUserId: z.string(),
  delegatePhoneMasked: z.string(),
  delegateName: z.string().optional(),
  relationship: z.string(),
  permissions: z.array(z.string()),
  status: z.string(),
  invitedAt: z.string(),
  revokedAt: z.string().optional(),
});
export type DelegationDto = z.infer<typeof delegationSchema>;

export const documentSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  label: localizedTextSchema,
  uploadedAt: z.string(),
  expiresAt: z.string().optional(),
  verificationLevel: z.string(),
  malwareScanStatus: z.string(),
  sensitive: z.boolean(),
  byteSize: z.number().int(),
});
export type DocumentSummaryDto = z.infer<typeof documentSummarySchema>;

export const uploadDocumentSchema = z.object({
  type: z.string(),
  label: localizedTextSchema.optional(),
  contentType: z.string(),
  /** Base64 payload. The slice keeps documents small and local; S3 is the production path. */
  contentBase64: z.string().min(1),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  caseId: z.string().optional(),
});
export type UploadDocumentDto = z.infer<typeof uploadDocumentSchema>;
