import { z } from 'zod';
import { ruleVersionSchema } from '@probash/rules';

/**
 * §64 — seed data is validated on load. A malformed or unlabelled synthetic record
 * fails startup loudly rather than reaching a worker's screen.
 */
const localized = z.object({ bn: z.string().min(1), en: z.string().min(1) });
const money = z.object({ minorUnits: z.string().regex(/^-?\d+$/), currency: z.string().length(3) });
const sourceRef = z.object({
  sourceId: z.string(),
  locator: z.string().optional(),
  retrievedAt: z.string().optional(),
});

const facet = z.object({
  key: z.string(),
  label: localized,
  checked: z.boolean(),
  method: z.enum([
    'self_declared',
    'document_upload',
    'registry_lookup',
    'authority_confirmation',
    'issuer_confirmation',
    'transaction_evidence',
    'human_review',
  ]),
  sourceId: z.string().optional(),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  note: localized.optional(),
});

const verificationSummary = z.object({
  level: z.enum([
    'unverified',
    'identity_verified',
    'registry_verified',
    'document_verified',
    'authority_verified',
    'transaction_verified',
    'post_outcome_verified',
  ]),
  facets: z.array(facet),
  notChecked: z.array(facet),
  lastVerifiedAt: z.string().optional(),
});

export const isoCountriesFileSchema = z.object({
  count: z.number().int().positive(),
  countries: z.array(z.object({ code: z.string().length(2), name: localized })),
});

export const countryStatusFileSchema = z.object({
  defaults: z.object({
    supportStatus: z.string(),
    workPriorityTier: z.string(),
    isStudyPriority: z.boolean(),
  }),
  countries: z.record(
    z.string().length(2),
    z.object({
      supportStatus: z.enum([
        'unsupported',
        'information_only',
        'researching',
        'pilot',
        'supported',
        'paused',
        'restricted',
        'suspended',
      ]),
      workPriorityTier: z.enum(['A', 'B', 'C', 'D', 'E', 'none']),
      isStudyPriority: z.boolean(),
      statusNotice: localized.optional(),
    }),
  ),
});

export const sourcesFileSchema = z.object({
  sources: z.array(
    z.object({
      id: z.string(),
      kind: z.enum([
        'government_portal',
        'ministry',
        'immigration_authority',
        'labour_authority',
        'embassy_mission',
        'official_registry',
        'international_organization',
        'institution_official',
        'official_bulletin_upload',
      ]),
      countryCode: z.string().length(2),
      authority: localized,
      title: localized,
      url: z.string().url(),
      reviewCadenceDays: z.number().int().positive(),
      lastRetrievedAt: z.string().optional(),
      lastReviewedAt: z.string().optional(),
      lastSnapshotHash: z.string().optional(),
      notes: localized.optional(),
    }),
  ),
});

const requirement = z.object({
  id: z.string(),
  kind: z.enum([
    'document',
    'education',
    'experience',
    'language',
    'skill',
    'medical',
    'police_clearance',
    'financial',
    'sponsor',
    'post_arrival',
  ]),
  label: localized,
  description: localized.optional(),
  mandatory: z.boolean(),
  factKey: z.string().optional(),
  sources: z.array(sourceRef).default([]),
  performedAt: localized.optional(),
  estimatedDays: z.number().int().optional(),
});

export const routesFileSchema = z.object({
  routeVersions: z.array(
    z.object({
      id: z.string(),
      routeId: z.string(),
      version: z.number().int().positive(),
      purpose: z.enum(['work', 'study', 'training', 'business', 'family', 'other']),
      originCountry: z.literal('BD'),
      destinationCountry: z.string().length(2),
      visaClass: z.string().optional(),
      permitClass: z.string().optional(),
      officialName: localized,
      summary: localized,
      status: z.enum([
        'open',
        'limited',
        'quota',
        'seasonal',
        'employer_sponsored',
        'government_program',
        'temporarily_paused',
        'closed',
        'unknown_needs_review',
      ]),
      eligibilityRuleId: z.string(),
      requirements: z.array(requirement),
      postArrivalObligations: z.array(requirement).default([]),
      riskNotices: z
        .array(
          z.object({
            id: z.string(),
            severity: z.enum(['info', 'caution', 'warning', 'severe']),
            title: localized,
            body: localized,
            sources: z.array(sourceRef).default([]),
          }),
        )
        .default([]),
      expectedTimeline: z
        .object({ minDays: z.number().int(), maxDays: z.number().int() })
        .optional(),
      workRightsNote: localized.optional(),
      studyRightsNote: localized.optional(),
      dependantsNote: localized.optional(),
      permanentPathwayNotes: localized.optional(),
      feeRuleIds: z.array(z.string()).default([]),
      sourceIds: z.array(z.string()).min(1),
      effectiveFrom: z.string(),
      effectiveTo: z.string().optional(),
      verifiedAt: z.string(),
      verifiedBy: z.string(),
      publicationStatus: z.enum(['draft', 'review', 'published', 'withdrawn']),
      reviewCadenceDays: z.number().int().positive(),
      lastReviewedAt: z.string().optional(),
      isSyntheticDemoData: z.literal(true),
    }),
  ),
});

export const rulesFileSchema = z.object({ ruleVersions: z.array(ruleVersionSchema) });

export const occupationsFileSchema = z.object({
  occupations: z.array(
    z.object({
      key: z.string(),
      family: z.string(),
      iscoCode: z.string().regex(/^\d{4}$/),
      skillLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      title: localized,
    }),
  ),
});

export const organizationsFileSchema = z.object({
  organizations: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'foreign_employer',
        'recruiting_agency',
        'education_institution',
        'training_provider',
        'medical_provider',
        'testing_provider',
        'assistance_desk',
        'government_body',
        'financial_partner',
      ]),
      legalName: localized,
      countryCode: z.string().length(2),
      registrationNumber: z.string().optional(),
      officialDomain: z.string().optional(),
      licences: z
        .array(
          z.object({
            id: z.string(),
            number: z.string(),
            authority: localized,
            countryCode: z.string().length(2),
            status: z.enum(['active', 'suspended', 'expired', 'revoked', 'unknown']),
            validFrom: z.string().optional(),
            validTo: z.string().optional(),
            sourceId: z.string().optional(),
            lastVerifiedAt: z.string().optional(),
          }),
        )
        .default([]),
      verification: verificationSummary,
      trustSignals: z
        .object({
          completedPlacements: z.number().int().min(0),
          upheldComplaints: z.number().int().min(0),
          averageDeploymentDays: z.number().optional(),
          lastOutcomeAt: z.string().optional(),
        })
        .optional(),
      isSyntheticDemoData: z.literal(true),
    }),
  ),
});

export const jobsFileSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      publicId: z.string().regex(/^BD-[A-Z]{2}-\d{4}-\d{8}$/),
      routeVersionId: z.string(),
      destinationCountry: z.string().length(2),
      occupationKey: z.string(),
      title: localized,
      description: localized,
      employerOrganizationId: z.string(),
      recruiterOrganizationId: z.string().nullable().optional(),
      positions: z.number().int().positive(),
      terms: z.object({
        monthlySalary: money,
        overtimePolicy: localized,
        workingHoursPerWeek: z.number(),
        contractDurationMonths: z.number(),
        probationMonths: z.number().optional(),
        accommodationProvided: z.boolean(),
        foodProvided: z.boolean(),
        transportProvided: z.boolean(),
        insuranceProvided: z.boolean(),
        annualLeaveDays: z.number(),
        airfarePaidBy: z.enum(['employer', 'worker', 'shared']),
        recruitmentFeePaidBy: z.enum(['employer', 'worker', 'shared']),
        workPermitPaidBy: z.enum(['employer', 'worker']),
        cancellationTerms: localized,
      }),
      allowedWorkerCost: money,
      verification: verificationSummary,
      publicationStatus: z.enum([
        'draft',
        'pending_verification',
        'published',
        'suspended',
        'closed',
      ]),
      demandValidFrom: z.string(),
      demandValidTo: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      isSyntheticDemoData: z.literal(true),
    }),
  ),
});

export const feeRulesFileSchema = z.object({
  currency: z.string().length(3),
  feeRules: z.array(
    z.object({
      id: z.string(),
      routeId: z.string(),
      category: z.enum([
        'government_fee',
        'passport_document_fee',
        'test_training_fee',
        'medical_fee',
        'travel_fee',
        'insurance_fee',
        'education_tuition_deposit',
        'recruitment_service_fee',
        'assistance_service_fee',
        'other_lawful_direct_cost',
      ]),
      label: localized,
      amount: money,
      payerKind: z.enum(['worker', 'student', 'employer', 'institution', 'government', 'agency']),
      payeeKind: z.enum([
        'government',
        'provider',
        'agency',
        'employer',
        'institution',
        'platform',
      ]),
      payeeOrganizationId: z.string().optional(),
      legallyAllowed: z.boolean().nullable(),
      legalBasisSourceId: z.string().optional(),
      refundable: z.boolean(),
      mandatory: z.boolean(),
      receiptRequired: z.boolean(),
      milestoneKey: z.string().optional(),
      sourceIds: z.array(z.string()),
      effectiveFrom: z.string(),
      effectiveTo: z.string().optional(),
      unresolved: z.boolean().optional(),
    }),
  ),
});

export const institutionsFileSchema = z.object({
  institutions: z.array(
    z.object({
      id: z.string(),
      legalName: localized,
      countryCode: z.string().length(2),
      institutionType: z.string(),
      officialDomain: z.string(),
      accreditationId: z.string().optional(),
      recognizedStatus: z.string(),
      sourceIds: z.array(z.string()),
      lastVerifiedAt: z.string().optional(),
      isSyntheticDemoData: z.literal(true),
    }),
  ),
});

export const coursesFileSchema = z.object({
  courses: z.array(
    z.object({
      id: z.string(),
      institutionId: z.string(),
      title: localized,
      degreeLevel: z.string(),
      subjectIscedF: z.string(),
      durationMonths: z.number().int().positive(),
      tuition: money,
      applicationFee: money.optional(),
      languageRequirement: localized.optional(),
      intakes: z.array(z.string()),
      sourceIds: z.array(z.string()),
      isSyntheticDemoData: z.literal(true),
    }),
  ),
});
