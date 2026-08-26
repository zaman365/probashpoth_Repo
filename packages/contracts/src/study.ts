import { z } from 'zod';
import { localizedTextSchema, moneySchema, sourceSummarySchema } from './primitives';
import { caseDetailSchema } from './cases';
import { matchRecommendationSchema } from './passport';

export const studyDiscoveryModeSchema = z.enum([
  'degree',
  'country',
  'budget',
  'scholarship',
  'post_study',
  'best_fit',
]);
export const studyDiscoveryQuerySchema = z.object({
  mode: studyDiscoveryModeSchema.default('best_fit'),
  targetLevel: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  budgetBdt: z.coerce.number().int().min(0).optional(),
});
export type StudyDiscoveryQueryDto = z.infer<typeof studyDiscoveryQuerySchema>;

export const programFactorSchema = z.object({
  key: z.string(),
  label: localizedTextSchema,
  state: z.enum(['meets', 'missing', 'unknown']),
  reason: localizedTextSchema,
  sourceIds: z.array(z.string()).default([]),
});

export const programIntelligenceSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  institutionName: localizedTextSchema,
  institutionCountryCode: z.string().length(2),
  institutionOfficialDomain: z.string(),
  institutionRecognizedStatus: z.string(),
  institutionTrust: z.enum(['verified', 'review_required', 'synthetic_demo']),
  title: localizedTextSchema,
  degreeLevel: z.string(),
  subjectIscedF: z.string(),
  durationMonths: z.number().int().positive(),
  tuition: moneySchema,
  applicationFee: moneySchema.optional(),
  intakes: z.array(z.string()),
  languageRequirement: localizedTextSchema.optional(),
  eligibility: z.enum([
    'directly_eligible',
    'conditionally_eligible',
    'eligible_after_prerequisite',
    'academically_ineligible',
    'language_missing',
    'document_missing',
    'unknown_institution_confirmation',
  ]),
  programFitPercent: z.number().int().min(0).max(100),
  evidenceCoveragePercent: z.number().int().min(0).max(100),
  factors: z.array(programFactorSchema),
  scholarship: z.object({ status: z.literal('unknown'), opportunities: z.array(z.never()) }),
  deadlines: z.object({ status: z.literal('unknown'), items: z.array(z.never()) }),
  fullDegreeCost: z.object({ status: z.literal('unknown'), amount: moneySchema.nullable() }),
  postStudyWork: z.object({ status: z.literal('unknown'), note: localizedTextSchema }),
  sources: z.array(sourceSummarySchema),
  lastVerifiedAt: z.string().optional(),
  isSyntheticDemoData: z.boolean(),
});
export type ProgramIntelligenceDto = z.infer<typeof programIntelligenceSchema>;

export const studyDiscoveryResultSchema = z.object({
  mode: studyDiscoveryModeSchema,
  passportVersion: z.number().int(),
  generatedAt: z.string(),
  programs: z.array(programIntelligenceSchema),
  note: localizedTextSchema,
});
export type StudyDiscoveryResultDto = z.infer<typeof studyDiscoveryResultSchema>;

export const addStudyShortlistSchema = z.object({
  programId: z.string(),
  category: z.enum(['dream', 'target', 'backup']),
  note: z.string().max(1000).optional(),
});
export type AddStudyShortlistDto = z.infer<typeof addStudyShortlistSchema>;

export const studyShortlistSchema = addStudyShortlistSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudyShortlistDto = z.infer<typeof studyShortlistSchema>;

export const studyCalendarItemSchema = z.object({
  id: z.string(),
  programId: z.string(),
  kind: z.enum([
    'intake',
    'application_deadline',
    'scholarship_deadline',
    'test_booking',
    'document_ordering',
    'referee_deadline',
    'deposit',
    'visa_appointment',
    'housing',
  ]),
  date: z.string().nullable(),
  status: z.enum(['known', 'unknown']),
  label: localizedTextSchema,
  sourceIds: z.array(z.string()),
});
export type StudyCalendarItemDto = z.infer<typeof studyCalendarItemSchema>;

export const createStudyApplicationSchema = z.object({
  programId: z.string(),
  intake: z.string(),
  unknownRulesAcknowledged: z.boolean().default(false),
});
export type CreateStudyApplicationDto = z.infer<typeof createStudyApplicationSchema>;

export const studyApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  programId: z.string(),
  institutionId: z.string(),
  caseId: z.string(),
  intake: z.string(),
  status: z.enum([
    'draft',
    'materials_preparing',
    'submitted',
    'institution_review',
    'conditional_offer',
    'unconditional_offer',
    'rejected',
    'accepted',
    'withdrawn',
  ]),
  eligibilityAtSubmission: programIntelligenceSchema.shape.eligibility,
  submittedAt: z.string(),
  updatedAt: z.string(),
});
export type StudyApplicationDto = z.infer<typeof studyApplicationSchema>;

export const reviewStudyStatementSchema = z.object({
  text: z.string().min(20).max(12000),
});
export type ReviewStudyStatementDto = z.infer<typeof reviewStudyStatementSchema>;

export const studyStatementReviewSchema = z.object({
  wordCount: z.number().int(),
  sections: z.array(
    z.object({ key: z.string(), present: z.boolean(), guidance: localizedTextSchema }),
  ),
  unsupportedClaimWarnings: z.array(localizedTextSchema),
  consistencyWarnings: z.array(localizedTextSchema),
  authorshipNotice: localizedTextSchema,
  rawTextStored: z.literal(false),
});
export type StudyStatementReviewDto = z.infer<typeof studyStatementReviewSchema>;

export const recordStudyOutcomeSchema = z.object({
  applicationId: z.string(),
  consentGiven: z.literal(true),
  admissionObtained: z.boolean().optional(),
  scholarshipObtained: z.boolean().optional(),
  visaObtained: z.boolean().optional(),
  enrolled: z.boolean().optional(),
  graduated: z.boolean().optional(),
  postStudyJobObtained: z.boolean().optional(),
  actualTuition: moneySchema.optional(),
  actualMonthlyLivingCost: moneySchema.optional(),
  postStudySalary: moneySchema.optional(),
  visaConvertedToWork: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
export type RecordStudyOutcomeDto = z.infer<typeof recordStudyOutcomeSchema>;

export const studyOutcomeSchema = recordStudyOutcomeSchema.extend({
  id: z.string(),
  userId: z.string(),
  observedAt: z.string(),
  reviewStatus: z.literal('pending_human_review'),
});
export type StudyOutcomeDto = z.infer<typeof studyOutcomeSchema>;

export const studyWorkHandoffSchema = z.object({
  confirmed: z.literal(true),
  targetOccupationKeys: z.array(z.string()).default([]),
});
export type StudyWorkHandoffDto = z.infer<typeof studyWorkHandoffSchema>;

export const studyWorkHandoffResultSchema = z.object({
  passportVersion: z.number().int(),
  workProfileVersion: z.number().int(),
  recommendations: z.array(matchRecommendationSchema),
  unknownOccupationMapping: z.boolean(),
  note: localizedTextSchema,
});
export type StudyWorkHandoffResultDto = z.infer<typeof studyWorkHandoffResultSchema>;

export const studyDashboardSchema = z.object({
  passportVersion: z.number().int(),
  shortlist: z.array(studyShortlistSchema),
  applications: z.array(studyApplicationSchema),
  cases: z.array(caseDetailSchema),
  calendar: z.array(studyCalendarItemSchema),
  nextActions: z.array(
    z.object({
      caseId: z.string(),
      taskId: z.string(),
      label: localizedTextSchema,
      status: z.string(),
    }),
  ),
});
export type StudyDashboardDto = z.infer<typeof studyDashboardSchema>;
