import { z } from 'zod';
import { localizedTextSchema } from './primitives';

const optionalDateSchema = z.string().optional();
const evidenceLinksSchema = z.array(z.string()).default([]);

export const passportIdentitySchema = z.object({
  legalName: z.string().min(1).optional(),
  dateOfBirth: optionalDateSchema,
  nationality: z.string().length(2).optional(),
  currentResidence: z.string().length(2).optional(),
  email: z.string().email().optional(),
  passportStatus: z.enum(['none', 'applied', 'valid', 'expired', 'unknown']).optional(),
  passportValidityMonths: z.number().int().min(0).max(240).optional(),
  identityVerificationStatus: z
    .enum(['unverified', 'pending', 'verified', 'conflict'])
    .default('unverified'),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  dependentCount: z.number().int().min(0).max(30).optional(),
  bmetRegistrationId: z.string().optional(),
});

export const financialReadinessSchema = z.object({
  plannedBudgetBdt: z.number().int().min(0).optional(),
  immediatelyAvailableBdt: z.number().int().min(0).optional(),
  familyContributionBdt: z.number().int().min(0).optional(),
  sponsorKind: z.enum(['none', 'family', 'employer', 'institution', 'other']).optional(),
  scholarshipNeeded: z.boolean().optional(),
  willingToTakeLoan: z.boolean().optional(),
  proofOfFundsReady: z.boolean().optional(),
  fundingPlanReady: z.boolean().optional(),
});

export const preferenceProfileSchema = z.object({
  openness: z.enum(['work', 'study', 'both', 'unsure']).default('unsure'),
  preferredCountries: z.array(z.string().length(2)).default([]),
  excludedCountries: z.array(z.string().length(2)).default([]),
  targetIncomeBdt: z.number().int().min(0).optional(),
  targetStartDate: optionalDateSchema,
  willingToLearnLanguage: z.boolean().optional(),
  willingToRetrain: z.boolean().optional(),
  willingToRelocateOutsideMajorCities: z.boolean().optional(),
  familyReunificationImportance: z.number().int().min(0).max(5).optional(),
  permanentResidenceImportance: z.number().int().min(0).max(5).optional(),
  citizenshipImportance: z.number().int().min(0).max(5).optional(),
  safetyImportance: z.number().int().min(0).max(5).optional(),
});

export const migrationPassportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  version: z.number().int().positive(),
  identity: passportIdentitySchema,
  financial: financialReadinessSchema,
  preferences: preferenceProfileSchema,
  documentIds: evidenceLinksSchema,
  consentIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MigrationPassportDto = z.infer<typeof migrationPassportSchema>;

export const updateMigrationPassportSchema = z.object({
  identity: passportIdentitySchema.partial().optional(),
  financial: financialReadinessSchema.partial().optional(),
  preferences: preferenceProfileSchema.partial().optional(),
  documentIds: z.array(z.string()).optional(),
});
export type UpdateMigrationPassportDto = z.infer<typeof updateMigrationPassportSchema>;

export const employmentHistorySchema = z.object({
  id: z.string(),
  employerName: z.string().min(1),
  countryCode: z.string().length(2).optional(),
  occupationKey: z.string().min(1),
  title: z.string().min(1).optional(),
  startedAt: optionalDateSchema,
  endedAt: optionalDateSchema,
  current: z.boolean().default(false),
  responsibilities: z.array(z.string()).default([]),
  evidenceDocumentIds: evidenceLinksSchema,
});

export const professionalCredentialSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'skill_certificate',
    'licence',
    'trade_test',
    'professional_registration',
    'driving_licence',
  ]),
  title: z.string().min(1),
  issuer: z.string().optional(),
  issuedAt: optionalDateSchema,
  expiresAt: optionalDateSchema,
  verificationStatus: z
    .enum(['unverified', 'pending', 'verified', 'expired', 'conflict'])
    .default('unverified'),
  evidenceDocumentIds: evidenceLinksSchema,
});

export const workProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  version: z.number().int().positive(),
  currentOccupationKey: z.string().optional(),
  targetOccupationKeys: z.array(z.string()).default([]),
  totalExperienceMonths: z.number().int().min(0).optional(),
  employmentHistory: z.array(employmentHistorySchema).default([]),
  technicalSkills: z.array(z.string()).default([]),
  credentials: z.array(professionalCredentialSchema).default([]),
  portfolioUrls: z.array(z.string().url()).default([]),
  cvDocumentId: z.string().optional(),
  medicallyFit: z.boolean().optional(),
  policeClearanceReady: z.boolean().optional(),
  bmetRegistrationReady: z.boolean().optional(),
  updatedAt: z.string(),
});
export type WorkProfileDto = z.infer<typeof workProfileSchema>;

export const updateWorkProfileSchema = workProfileSchema
  .omit({ id: true, userId: true, version: true, updatedAt: true })
  .partial();
export type UpdateWorkProfileDto = z.infer<typeof updateWorkProfileSchema>;

export const academicCredentialSchema = z.object({
  id: z.string(),
  level: z.enum([
    'secondary',
    'higher_secondary',
    'diploma',
    'vocational',
    'bachelor',
    'master',
    'mphil',
    'doctorate',
  ]),
  institution: z.string().min(1),
  awardingBody: z.string().optional(),
  field: z.string().optional(),
  resultKind: z.enum(['cgpa', 'gpa', 'percentage', 'class', 'other']).optional(),
  resultValue: z.string().optional(),
  resultScale: z.string().optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  mediumOfInstruction: z.string().optional(),
  credits: z.number().min(0).optional(),
  certificateDocumentIds: evidenceLinksSchema,
  transcriptDocumentIds: evidenceLinksSchema,
});

export const transcriptCourseSchema = z.object({
  id: z.string(),
  academicCredentialId: z.string(),
  title: z.string().min(1),
  subjectCode: z.string().optional(),
  credits: z.number().min(0).optional(),
  grade: z.string().optional(),
  normalizedSubjectTags: z.array(z.string()).default([]),
});

export const languageEvidenceSchema = z.object({
  id: z.string(),
  language: z.string().min(2),
  selfAssessedLevel: z.enum(['none', 'basic', 'intermediate', 'advanced']).optional(),
  testName: z.string().optional(),
  overallScore: z.string().optional(),
  level: z.string().optional(),
  testDate: optionalDateSchema,
  expiresAt: optionalDateSchema,
  evidenceDocumentIds: evidenceLinksSchema,
});

export const academicGapSchema = z.object({
  id: z.string(),
  startedAt: optionalDateSchema,
  endedAt: optionalDateSchema,
  truthfulContext: z.string().optional(),
  evidenceDocumentIds: evidenceLinksSchema,
});

export const academicProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  version: z.number().int().positive(),
  targetLevel: z.enum(['bachelor', 'master', 'phd', 'professional', 'unsure']).optional(),
  targetFields: z.array(z.string()).default([]),
  education: z.array(academicCredentialSchema).default([]),
  transcriptCourses: z.array(transcriptCourseSchema).default([]),
  languageEvidence: z.array(languageEvidenceSchema).default([]),
  academicGaps: z.array(academicGapSchema).default([]),
  researchInterests: z.array(z.string()).default([]),
  publications: z.array(z.string()).default([]),
  portfolioUrls: z.array(z.string().url()).default([]),
  academicCvDocumentId: z.string().optional(),
  statementDocumentId: z.string().optional(),
  recommendationDocumentIds: evidenceLinksSchema,
  researchProposalDocumentId: z.string().optional(),
  updatedAt: z.string(),
});
export type AcademicProfileDto = z.infer<typeof academicProfileSchema>;

export const updateAcademicProfileSchema = academicProfileSchema
  .omit({ id: true, userId: true, version: true, updatedAt: true })
  .partial();
export type UpdateAcademicProfileDto = z.infer<typeof updateAcademicProfileSchema>;

export const passportBundleSchema = z.object({
  shared: migrationPassportSchema,
  work: workProfileSchema,
  study: academicProfileSchema,
});
export type PassportBundleDto = z.infer<typeof passportBundleSchema>;

export const readinessFactorSchema = z.object({
  id: z.string(),
  path: z.enum(['work', 'study']),
  dimension: z.string(),
  state: z.enum(['ready', 'missing', 'unknown']),
  weight: z.number(),
  labelKey: z.string(),
  actionKey: z.string(),
  needsRouteEvidence: z.boolean(),
});

export const readinessAssessmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  path: z.enum(['work', 'study']),
  passportVersion: z.number().int().positive(),
  profileVersion: z.number().int().positive(),
  engineVersion: z.string(),
  outcome: z.enum(['ready', 'near_ready', 'needs_preparation', 'needs_review']),
  readinessPercent: z.number().int().min(0).max(100),
  evidenceCoveragePercent: z.number().int().min(0).max(100),
  factors: z.array(readinessFactorSchema),
  sourceIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type ReadinessAssessmentDto = z.infer<typeof readinessAssessmentSchema>;

export const preparationTaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  assessmentId: z.string(),
  path: z.enum(['work', 'study']),
  dimension: z.string(),
  state: z.enum(['missing', 'unknown']),
  priority: z.enum(['now', 'next', 'confirm']),
  labelKey: z.string(),
  actionKey: z.string(),
  needsRouteEvidence: z.boolean(),
  sourceIds: z.array(z.string()).default([]),
  templateVersion: z.string(),
  status: z.enum(['open', 'in_progress', 'done', 'dismissed']).default('open'),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type PreparationTaskDto = z.infer<typeof preparationTaskSchema>;

export const assessmentBundleSchema = z.object({
  work: readinessAssessmentSchema,
  study: readinessAssessmentSchema,
  tasks: z.array(preparationTaskSchema),
});
export type AssessmentBundleDto = z.infer<typeof assessmentBundleSchema>;

export const matchFactorSchema = z.object({
  key: z.string(),
  state: z.enum(['fit', 'gap', 'unknown']),
  weight: z.number(),
  sourceIds: z.array(z.string()).optional(),
});

export const matchRecommendationSchema = z.object({
  rank: z.number().int().positive(),
  candidateId: z.string(),
  path: z.enum(['work', 'study']),
  countryCode: z.string().length(2),
  title: localizedTextSchema,
  provider: localizedTextSchema.optional(),
  hardEligibility: z.enum(['eligible', 'conditional', 'ineligible', 'unknown']),
  preparationScore: z.number().int().min(0).max(100),
  evidenceCoveragePercent: z.number().int().min(0).max(100),
  factors: z.array(matchFactorSchema),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  unknowns: z.array(z.string()),
  sourceIds: z.array(z.string()),
  dataStatus: z.enum(['verified', 'review_required', 'synthetic_demo']),
});
export type MatchRecommendationDto = z.infer<typeof matchRecommendationSchema>;

export const recommendationSetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passportVersion: z.number().int().positive(),
  engineVersion: z.string(),
  work: z.array(matchRecommendationSchema),
  study: z.array(matchRecommendationSchema),
  comparison: z.object({
    genericWinner: z.null(),
    noteKey: z.literal('passport.comparisonNote'),
  }),
  createdAt: z.string(),
});
export type RecommendationSetDto = z.infer<typeof recommendationSetSchema>;

export const alertSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  path: z.enum(['work', 'study', 'both']),
  countryCodes: z.array(z.string().length(2)).default([]),
  candidateIds: z.array(z.string()).default([]),
  eventTypes: z.array(z.string()).default([]),
  channel: z.enum(['in_app', 'sms', 'email']),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AlertSubscriptionDto = z.infer<typeof alertSubscriptionSchema>;

export const createAlertSubscriptionSchema = alertSubscriptionSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAlertSubscriptionDto = z.infer<typeof createAlertSubscriptionSchema>;
