import type {
  CountrySummaryDto,
  EligibilityResponseDto,
  JobDetailDto,
  JobSummaryDto,
  OccupationSummaryDto,
  OutcomeAggregateDto,
  PublicJobVerificationDto,
  RequestOptions,
  RouteDetailDto,
  RouteSummaryDto,
  ScanResultDto,
  ServiceDirectoryEntryDto,
  SourceSummaryDto,
  QuickCheckInputDto,
  QuickCheckResultDto,
  RouteCoverageDto,
  OfficialActionDto,
  TrustCenterDto,
  CapabilityRegistryItemDto,
} from '@probash/contracts';
import { ApiRequestError } from '@probash/contracts';
import { freshnessOf, routeAcceptsApplications } from '@probash/domain';
import countriesData from '../../../data/iso/countries.json';
import countryProfilesData from '../../../data/seed/country-profiles.json';
import countryStatusData from '../../../data/seed/country-status.json';
import coursesData from '../../../data/seed/courses.json';
import institutionsData from '../../../data/seed/institutions.json';
import jobsData from '../../../data/seed/jobs.json';
import occupationsData from '../../../data/seed/occupations.json';
import organizationsData from '../../../data/seed/organizations.json';
import routesData from '../../../data/seed/routes.json';
import sourcesData from '../../../data/seed/sources.json';

type Localized = { bn: string; en: string };
type Money = { minorUnits: string; currency: string };

interface DemoSource {
  id: string;
  kind: string;
  countryCode: string;
  authority: Localized;
  title: Localized;
  url: string;
  reviewCadenceDays: number;
  lastReviewedAt?: string;
  trustTier?: SourceSummaryDto['trustTier'];
  status?: SourceSummaryDto['status'];
}

interface DemoRequirement {
  id: string;
  kind: string;
  label: Localized;
  description?: Localized;
  mandatory: boolean;
  estimatedDays?: number;
  performedAt?: Localized;
  sources: { sourceId: string }[];
}

interface DemoRoute {
  id: string;
  routeId: string;
  version: number;
  purpose: string;
  destinationCountry: string;
  officialName: Localized;
  summary: Localized;
  status:
    | 'open'
    | 'limited'
    | 'quota'
    | 'seasonal'
    | 'employer_sponsored'
    | 'government_program'
    | 'temporarily_paused'
    | 'closed'
    | 'unknown_needs_review';
  expectedTimeline?: { minDays: number; maxDays: number };
  lastReviewedAt?: string;
  reviewCadenceDays: number;
  visaClass?: string;
  permitClass?: string;
  requirements: DemoRequirement[];
  postArrivalObligations: DemoRequirement[];
  riskNotices: {
    id: string;
    severity: 'info' | 'caution' | 'warning' | 'severe';
    title: Localized;
    body: Localized;
    sources: { sourceId: string }[];
  }[];
  workRightsNote?: Localized;
  studyRightsNote?: Localized;
  dependantsNote?: Localized;
  permanentPathwayNotes?: Localized;
  sourceIds: string[];
  effectiveFrom: string;
  verifiedAt: string;
  publicationStatus: string;
}

interface DemoOrganization {
  id: string;
  type: string;
  legalName: Localized;
  countryCode: string;
  officialDomain?: string;
  contactEmail?: string;
  licences: { number: string; status: string; validTo?: string; sourceId?: string }[];
  verification: {
    level: string;
    lastVerifiedAt?: string;
    facets: { checked: boolean; method: string; sourceId?: string }[];
  };
  trustSignals?: { completedPlacements: number };
  suspendedAt?: string;
  isSyntheticDemoData: boolean;
}

interface DemoJob {
  id: string;
  publicId: string;
  routeVersionId: string;
  destinationCountry: string;
  occupationKey: string;
  title: Localized;
  description: Localized;
  employerOrganizationId: string;
  recruiterOrganizationId?: string;
  positions: number;
  terms: JobDetailDto['terms'];
  allowedWorkerCost: Money;
  verification: JobDetailDto['verification'];
  publicationStatus: string;
  demandValidTo: string;
  isSyntheticDemoData: boolean;
}

const routes = routesData.routeVersions as unknown as DemoRoute[];
const sources = sourcesData.sources as unknown as DemoSource[];
const jobs = jobsData.jobs as unknown as DemoJob[];
const organizations = organizationsData.organizations as unknown as DemoOrganization[];

function sourceSummary(source: DemoSource): SourceSummaryDto {
  return {
    id: source.id,
    kind: source.kind,
    authority: source.authority,
    title: source.title,
    url: source.url,
    lastReviewedAt: source.lastReviewedAt,
    freshness: freshnessOf(source.lastReviewedAt, source.reviewCadenceDays),
    trustTier:
      source.trustTier ??
      (source.kind === 'international_organization'
        ? 'TIER_2_REGULATOR_OR_PUBLIC_BODY'
        : source.kind === 'institution_official'
          ? 'TIER_3_INSTITUTION_OR_EMPLOYER'
          : 'TIER_1_OFFICIAL'),
    status: source.status ?? 'ACTIVE',
  };
}

function resolveSources(ids: readonly string[]): SourceSummaryDto[] {
  return [...new Set(ids)]
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is DemoSource => Boolean(source))
    .map(sourceSummary);
}

function routeSummary(route: DemoRoute): RouteSummaryDto {
  return {
    id: route.id,
    routeId: route.routeId,
    version: route.version,
    purpose: route.purpose,
    destinationCountry: route.destinationCountry,
    officialName: route.officialName,
    summary: route.summary,
    status: route.status,
    acceptsApplications: routeAcceptsApplications(route.status),
    expectedTimeline: route.expectedTimeline,
    lastReviewedAt: route.lastReviewedAt,
    freshness: freshnessOf(route.lastReviewedAt, route.reviewCadenceDays),
    coverageMaturity: 'RESEARCH_ONLY',
    bangladeshAccessibility: routeAcceptsApplications(route.status)
      ? 'NOT_CONFIRMED'
      : 'NOT_ELIGIBLE',
  };
}

function routeDetail(route: DemoRoute): RouteDetailDto {
  const nestedSourceIds = [
    ...route.requirements.flatMap((item) => item.sources.map((source) => source.sourceId)),
    ...route.postArrivalObligations.flatMap((item) =>
      item.sources.map((source) => source.sourceId),
    ),
    ...route.riskNotices.flatMap((item) => item.sources.map((source) => source.sourceId)),
  ];
  const requirement = (item: DemoRequirement) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    description: item.description,
    mandatory: item.mandatory,
    estimatedDays: item.estimatedDays,
    performedAt: item.performedAt,
    sourceIds: item.sources.map((source) => source.sourceId),
  });

  return {
    ...routeSummary(route),
    visaClass: route.visaClass,
    permitClass: route.permitClass,
    requirements: route.requirements.map(requirement),
    postArrivalObligations: route.postArrivalObligations.map(requirement),
    riskNotices: route.riskNotices.map((notice) => ({
      id: notice.id,
      severity: notice.severity,
      title: notice.title,
      body: notice.body,
      sourceIds: notice.sources.map((source) => source.sourceId),
    })),
    workRightsNote: route.workRightsNote,
    studyRightsNote: route.studyRightsNote,
    dependantsNote: route.dependantsNote,
    permanentPathwayNotes: route.permanentPathwayNotes,
    sources: resolveSources([...route.sourceIds, ...nestedSourceIds]),
    effectiveFrom: route.effectiveFrom,
    verifiedAt: route.verifiedAt,
    publicationStatus: route.publicationStatus,
  };
}

function publishedJobs(url: URL): DemoJob[] {
  const country = url.searchParams.get('country')?.toUpperCase();
  const occupation = url.searchParams.get('occupation');
  const employerPays = url.searchParams.get('employerPays') === 'true';
  return jobs
    .filter((job) => job.publicationStatus === 'published')
    .filter((job) => !country || job.destinationCountry === country)
    .filter((job) => !occupation || job.occupationKey === occupation)
    .filter((job) => !employerPays || job.terms.recruitmentFeePaidBy === 'employer');
}

function organization(id: string | undefined): DemoOrganization | undefined {
  return id ? organizations.find((entry) => entry.id === id) : undefined;
}

function serviceDirectory(url: URL): ServiceDirectoryEntryDto[] {
  const type = url.searchParams.get('type');
  const country = url.searchParams.get('country')?.toUpperCase();
  const organizationEntries = organizations
    .filter((item) => !type || item.type === type)
    .filter((item) => !country || item.countryCode === country)
    .map((item) => {
      const checked = item.verification.facets.filter((facet) => facet.checked);
      const officialStatus: ServiceDirectoryEntryDto['officialStatus'] = item.suspendedAt
        ? 'suspended'
        : checked.some((facet) =>
              ['authority_confirmation', 'transaction_evidence'].includes(facet.method),
            )
          ? 'verified'
          : checked.length > 0
            ? 'partially_verified'
            : 'unverified';
      return {
        id: item.id,
        type: item.type,
        legalName: item.legalName,
        countryCode: item.countryCode,
        officialStatus,
        officialDomain: item.officialDomain,
        officialContact: { email: item.contactEmail },
        services: [],
        licences: item.licences.map((licence) => ({
          number: licence.number,
          status: licence.status,
          validTo: licence.validTo,
        })),
        complaintCount: 0,
        publishedSafetyIncidentCount: 0,
        outcomeCount: item.trustSignals?.completedPlacements ?? 0,
        sources: resolveSources([
          ...item.licences.flatMap((licence) => (licence.sourceId ? [licence.sourceId] : [])),
          ...item.verification.facets.flatMap((facet) => (facet.sourceId ? [facet.sourceId] : [])),
        ]),
        lastVerifiedAt: item.verification.lastVerifiedAt,
        isSyntheticDemoData: item.isSyntheticDemoData,
      };
    });
  const institutionEntries: ServiceDirectoryEntryDto[] = institutionsData.institutions
    .filter(() => !type || type === 'education_institution')
    .filter((item) => !country || item.countryCode === country)
    .map((item) => ({
      id: item.id,
      type: 'education_institution',
      legalName: item.legalName,
      countryCode: item.countryCode,
      officialStatus: item.lastVerifiedAt ? 'partially_verified' : 'unverified',
      officialDomain: item.officialDomain,
      officialContact: {},
      services: [],
      licences: [],
      complaintCount: 0,
      publishedSafetyIncidentCount: 0,
      outcomeCount: 0,
      sources: resolveSources(item.sourceIds),
      lastVerifiedAt: item.lastVerifiedAt,
      isSyntheticDemoData: item.isSyntheticDemoData,
    }));
  return [...organizationEntries, ...institutionEntries];
}

function outcomeAggregate(url: URL): OutcomeAggregateDto {
  const path = url.searchParams.get('path') === 'study' ? 'study' : 'work';
  return {
    path,
    countryCode: url.searchParams.get('country')?.toUpperCase(),
    organizationId: url.searchParams.get('organization') ?? undefined,
    currency: url.searchParams.get('currency')?.toUpperCase(),
    minimumCohortSize: 5,
    reviewedCohortSize: 0,
    suppressed: true,
    metrics: null,
    privacyNotice: {
      bn: 'ডেমো সাইটে পাঁচটি মানব-যাচাইকৃত, সম্মত ফলাফল নেই—তাই কোনো সমষ্টিগত মেট্রিক দেখানো হয়নি।',
      en: 'The demo site has fewer than five consented, human-reviewed outcomes, so aggregate metrics are hidden.',
    },
  };
}

function jobSummary(job: DemoJob): JobSummaryDto {
  return {
    id: job.id,
    publicId: job.publicId,
    title: job.title,
    destinationCountry: job.destinationCountry,
    occupationKey: job.occupationKey,
    monthlySalary: job.terms.monthlySalary,
    positions: job.positions,
    employerName: organization(job.employerOrganizationId)?.legalName ?? {
      bn: 'ডেমো নিয়োগকর্তা',
      en: 'Demo employer',
    },
    agencyName: organization(job.recruiterOrganizationId)?.legalName,
    verificationLevel: job.verification.level,
    allowedWorkerCost: job.allowedWorkerCost,
    recruitmentFeePaidBy: job.terms.recruitmentFeePaidBy,
    demandValidTo: job.demandValidTo,
    isSyntheticDemoData: true,
    bangladeshAccessibility: 'NOT_CONFIRMED',
    accessibilityReason: {
      bn: 'ডেমো রেকর্ড—বাংলাদেশি আবেদনকারীর জন্য স্পনসরশিপ নিশ্চিত নয়।',
      en: 'Demo record—sponsorship for a Bangladeshi applicant is not confirmed.',
    },
  };
}

function jobDetail(job: DemoJob): JobDetailDto {
  const route = routes.find((entry) => entry.id === job.routeVersionId);
  const agency = organization(job.recruiterOrganizationId);
  return {
    ...jobSummary(job),
    description: job.description,
    routeVersionId: job.routeVersionId,
    terms: job.terms,
    verification: job.verification,
    agencyLicence: agency?.licences[0],
    sources: resolveSources(route?.sourceIds ?? []),
  };
}

function countrySummaries(url: URL): CountrySummaryDto[] {
  const purpose = url.searchParams.get('purpose');
  const publishedRoutes = routes.filter(
    (route) =>
      route.publicationStatus === 'published' &&
      (!purpose || (purpose === 'work' ? route.purpose !== 'study' : route.purpose === purpose)),
  );
  const defaults = countryStatusData.defaults;
  const overrides = countryStatusData.countries as Record<
    string,
    {
      supportStatus?: string;
      workPriorityTier?: string;
      isStudyPriority?: boolean;
      statusNotice?: Localized;
    }
  >;
  const rows = countriesData.countries.map((country) => {
    const status = overrides[country.code] ?? {};
    return {
      code: country.code,
      name: country.name,
      supportStatus: status.supportStatus ?? defaults.supportStatus,
      workPriorityTier: status.workPriorityTier ?? defaults.workPriorityTier,
      isStudyPriority: status.isStudyPriority ?? defaults.isStudyPriority,
      statusNotice: status.statusNotice,
      routeCount: publishedRoutes.filter((route) => route.destinationCountry === country.code)
        .length,
    } satisfies CountrySummaryDto;
  });

  return rows
    .filter((country) => url.searchParams.get('withRoutes') !== 'true' || country.routeCount > 0)
    .sort(
      (left, right) =>
        right.routeCount - left.routeCount || left.name.en.localeCompare(right.name.en),
    );
}

function publicVerification(publicId: string): PublicJobVerificationDto {
  const job = jobs.find((entry) => entry.publicId === publicId.trim().toUpperCase());
  if (!job) return { publicId, status: 'not_found' };

  const agency = organization(job.recruiterOrganizationId);
  const occupation = (occupationsData.occupations as unknown as OccupationSummaryDto[]).find(
    (entry) => entry.key === job.occupationKey,
  );
  const expired = Date.parse(job.demandValidTo) <= Date.now();
  const status =
    job.publicationStatus === 'suspended' ? 'suspended' : expired ? 'expired' : 'verified';

  return {
    publicId: job.publicId,
    status,
    employerName: organization(job.employerOrganizationId)?.legalName,
    agencyName: agency?.legalName,
    agencyLicence: agency?.licences[0],
    occupation: occupation?.title,
    destinationCountry: job.destinationCountry,
    monthlySalary: job.terms.monthlySalary,
    allowedWorkerCost: job.allowedWorkerCost,
    demandValidTo: job.demandValidTo,
    verification: job.verification,
    lastVerifiedAt: job.verification.lastVerifiedAt,
    isSyntheticDemoData: true,
  };
}

function scan(body: unknown): ScanResultDto {
  const input = (body ?? {}) as { publicJobId?: string; messageText?: string };
  const matched = input.publicJobId
    ? jobs.find((job) => job.publicId === input.publicJobId?.trim().toUpperCase())
    : undefined;
  const message = input.messageText?.toLowerCase() ?? '';
  const risky = /(?:personal account|bkash|nagad|cash|urgent|আজই|এখনই|ব্যক্তিগত|বিকাশ|নগদ)/i.test(
    message,
  );
  const verdict = matched
    ? 'PARTIALLY_VERIFIED'
    : risky
      ? 'HIGH_RISK'
      : 'UNKNOWN_HUMAN_CHECK_REQUIRED';

  return {
    verdict,
    checksPerformed: [
      {
        key: 'public_job_id',
        label: { bn: 'পাবলিক চাকরি আইডি', en: 'Public job ID' },
        performed: Boolean(input.publicJobId),
        passed: input.publicJobId ? Boolean(matched) : null,
        detail: matched
          ? { bn: 'ডেমো তালিকায় আইডিটি পাওয়া গেছে।', en: 'The ID exists in the demo catalogue.' }
          : undefined,
      },
      {
        key: 'payment_language',
        label: { bn: 'সন্দেহজনক পেমেন্ট ভাষা', en: 'Suspicious payment language' },
        performed: Boolean(message),
        passed: message ? !risky : null,
      },
    ],
    signals: risky
      ? [
          {
            id: 'demo-direct-payment-risk',
            kind: 'unverified_payment_destination',
            level: 'high',
            title: { bn: 'সরাসরি টাকা চাওয়া হয়েছে', en: 'Direct payment requested' },
            explanation: {
              bn: 'ব্যক্তিগত নম্বর, নগদ বা তাড়াহুড়ো করে টাকা চাওয়া প্রতারণার সাধারণ লক্ষণ।',
              en: 'Requests for personal transfers, cash, or urgent payment are common fraud signals.',
            },
            advice: {
              bn: 'টাকা দেবেন না। লাইসেন্স, চুক্তি ও সরকারি উৎস আলাদাভাবে যাচাই করুন।',
              en: 'Do not pay. Verify the licence, contract, and official source separately.',
            },
            evidence: {},
            sourceIds: [],
          },
        ]
      : [],
    matchedJobPublicId: matched?.publicId,
    humanReviewRequested: !matched,
    scannedAt: new Date().toISOString(),
    explanation: matched
      ? {
          bn: 'আইডিটি ডেমো তালিকায় আছে, কিন্তু এটি মানব-যাচাইকৃত বাস্তব চাকরি নয়। টাকা দেওয়ার সিদ্ধান্ত নেবেন না।',
          en: 'The ID is in the demo catalogue, but this is not a human-verified real job. Do not make a payment decision from it.',
        }
      : {
          bn: 'এই তথ্য থেকে প্রস্তাবটি সত্য বলে নিশ্চিত হওয়া যায়নি। মানব যাচাই ছাড়া টাকা দেবেন না।',
          en: 'The offer cannot be confirmed from this information. Do not pay without human verification.',
        },
  };
}

function eligibility(body: unknown): EligibilityResponseDto {
  const routeId = (body as { routeVersionId?: string } | undefined)?.routeVersionId ?? '';
  const route = routes.find((entry) => entry.id === routeId);
  if (!route) throw new ApiRequestError(404, 'NOT_FOUND', 'Route not found');

  return {
    routeVersionId: route.id,
    trace: {
      result: 'unknown',
      ruleVersionIds: [],
      satisfied: [],
      unsatisfied: [],
      remediable: [],
      missingFacts: route.requirements
        .filter((requirement) => requirement.mandatory)
        .map((requirement) => ({
          factKey: requirement.id,
          nodeId: requirement.id,
          label: requirement.label,
        })),
      sources: route.sourceIds.map((sourceId) => ({ sourceId })),
      evaluatedAt: new Date().toISOString(),
    },
    sources: resolveSources(route.sourceIds),
    humanReviewOffered: true,
  };
}

function demoRouteCoverage(route: DemoRoute): RouteCoverageDto {
  return {
    id: `coverage_${route.id}`,
    routeVersionId: route.id,
    countryCode: route.destinationCountry,
    nationalityScope: ['BD'],
    maturity: 'RESEARCH_ONLY',
    officialInformationAvailable: route.sourceIds.length > 0,
    eligibilityEngineAvailable: false,
    applicationGuidanceAvailable: false,
    verifiedPartnerAvailable: false,
    officialFeeDataAvailable: false,
    processingTimeDataAvailable: Boolean(route.expectedTimeline),
    sourceLastVerifiedAt: route.lastReviewedAt,
    checklist: {
      officialSourcesMapped: route.sourceIds.length > 0,
      visaRoutesMapped: Boolean(route.visaClass || route.permitClass),
      costsMapped: false,
      recognitionMapped: false,
      languageMapped: route.requirements.some((item) => item.kind === 'language'),
      opportunitiesMapped: false,
      providerVerificationAvailable: false,
      complaintAndEmergencySourcesMapped: route.riskNotices.length > 0,
      arrivalTasksMapped: route.postArrivalObligations.length > 0,
      contentReviewed: false,
      legalReviewComplete: false,
      dataOwnerAssigned: false,
      freshnessSlaConfigured: route.reviewCadenceDays > 0,
    },
    updatedAt: route.lastReviewedAt ?? route.verifiedAt,
  };
}

function demoQuickCheck(body: unknown): QuickCheckResultDto {
  const input = body as QuickCheckInputDto;
  const preferred = input.preferredCountryCodes?.map((code) => code.toUpperCase()) ?? [];
  const selected = routes
    .filter((route) => route.publicationStatus === 'published')
    .filter(
      (route) =>
        input.goal === 'EXPLORE' ||
        (input.goal === 'WORK' && route.purpose === 'work') ||
        (input.goal === 'STUDY' && route.purpose === 'study') ||
        (input.goal === 'TRAINING' && route.purpose === 'training'),
    )
    .filter((route) => preferred.length === 0 || preferred.includes(route.destinationCountry))
    .slice(0, 8);
  return {
    generatedAt: new Date().toISOString(),
    accountRequired: false,
    routes: selected.map((route) => {
      const trace = eligibility({ routeVersionId: route.id }).trace;
      return {
        routeVersionId: route.id,
        routeId: route.routeId,
        title: route.officialName,
        destinationCountry: route.destinationCountry,
        goal:
          route.purpose === 'work'
            ? 'WORK'
            : route.purpose === 'study'
              ? 'STUDY'
              : route.purpose === 'training'
                ? 'TRAINING'
                : 'EXPLORE',
        eligibility: trace,
        fit: 'POSSIBLE_FIT',
        fitReasons: [
          { bn: 'প্রাথমিক তথ্য পাওয়া গেছে', en: 'Preliminary information is available' },
        ],
        preparationGaps: trace.missingFacts.map((item) => item.label),
        estimatedPreparation: {
          minMonths: 1,
          maxMonths: Math.max(3, trace.missingFacts.length * 2),
        },
        timeRange: route.expectedTimeline,
        coverageMaturity: 'RESEARCH_ONLY',
        bangladeshAccessibility: routeAcceptsApplications(route.status)
          ? 'NOT_CONFIRMED'
          : 'NOT_ELIGIBLE',
        confidence: 'NEEDS_HUMAN_REVIEW',
        sources: resolveSources(route.sourceIds),
        lastVerifiedAt: route.lastReviewedAt,
      };
    }),
    disclaimer: {
      bn: 'এটি ডেমো ও প্রাথমিক যাচাই—চাকরি, ভর্তি বা ভিসার নিশ্চয়তা নয়। সরকারি উৎস আবার দেখুন।',
      en: 'This is a demo preliminary check, not a job, admission, or visa guarantee. Recheck official sources.',
    },
    escalationOffered: true,
  };
}

function demoOfficialActions(): OfficialActionDto[] {
  const source = sources.find((item) => item.id === 'src_bd_oep')!;
  return [
    {
      id: 'official_bd_oep_registration',
      countryCode: 'BD',
      authority: source.authority,
      actionType: 'BMET_REGISTRATION',
      title: { bn: 'বিএমইটি / ওইপি নিবন্ধন', en: 'BMET / OEP registration' },
      description: {
        bn: 'প্রস্তুতি দেখে সরকারি সিস্টেমে কাজটি সম্পন্ন করুন।',
        en: 'Review the preparation, then complete the action in the official system.',
      },
      officialUrl: 'https://www.oep.gov.bd/',
      isExternal: true,
      requiresAccount: true,
      requiresInPerson: false,
      feeType: 'VARIES',
      sourceRecordId: source.id,
      lastVerifiedAt: source.lastReviewedAt,
      status: 'ACTIVE',
      preparationRequirementIds: [],
      legalReviewRequired: false,
    },
    {
      id: 'official_bd_raims_agency',
      countryCode: 'BD',
      authority: { bn: 'বিএমইটি', en: 'BMET' },
      actionType: 'AGENCY_VERIFICATION',
      title: { bn: 'এজেন্সির লাইসেন্স যাচাই', en: 'Verify an agency licence' },
      description: {
        bn: 'সরকারি রেইমস রেকর্ডে লাইসেন্স মিলিয়ে দেখুন।',
        en: 'Compare the licence with the official RAIMS register.',
      },
      officialUrl: 'https://raims.bmet.gov.bd/agencies',
      isExternal: true,
      requiresAccount: false,
      requiresInPerson: false,
      feeType: 'FREE',
      sourceRecordId: source.id,
      lastVerifiedAt: source.lastReviewedAt,
      status: 'ACTIVE',
      preparationRequirementIds: [],
      legalReviewRequired: false,
    },
  ];
}

function demoTrustCenter(): TrustCenterDto {
  return {
    verificationStatuses: [
      'UNVERIFIED',
      'PENDING',
      'BASIC_VERIFIED',
      'LICENSE_VERIFIED',
      'ENHANCED_VERIFIED',
      'RESTRICTED',
      'SUSPENDED',
      'REMOVED',
      'EXPIRED',
    ],
    providerCategories: [
      'UNIVERSITY',
      'EMPLOYER',
      'RECRUITING_AGENCY',
      'ADVISOR',
      'TRAINING_CENTER',
      'FINANCE_PROVIDER',
      'INSURANCE_PROVIDER',
      'ACCOMMODATION_PROVIDER',
    ],
    sections: [
      {
        key: 'verification',
        title: { bn: 'যাচাই কীভাবে হয়', en: 'How verification works' },
        body: {
          bn: 'প্রতিটি দাবির উৎস, তারিখ, মেয়াদ ও পদ্ধতি আলাদা করে রাখা হয়।',
          en: 'Every claim records its source, date, expiry and method.',
        },
      },
      {
        key: 'ranking',
        title: { bn: 'নিরপেক্ষ সুপারিশ', en: 'Neutral recommendations' },
        body: {
          bn: 'কমিশন অর্গানিক মিল বদলায় না; স্পনসরড ফল আলাদা।',
          en: 'Commission does not change organic fit; sponsored results stay separate.',
        },
      },
      {
        key: 'privacy',
        title: { bn: 'ডকুমেন্ট ও গোপনীয়তা', en: 'Documents and privacy' },
        body: {
          bn: 'সংবেদনশীল অ্যাক্সেসে সম্মতি, সীমা ও অডিট লাগে।',
          en: 'Sensitive access requires consent, scope and audit.',
        },
      },
    ],
    recommendationNeutrality: {
      organicRankingUsesCommission: false,
      sponsoredSeparated: true,
      partnerRelationshipDisclosed: true,
    },
    safetyBasicsPaywalled: false,
    lastReviewedAt: new Date().toISOString(),
  };
}

function demoCapabilities(): CapabilityRegistryItemDto[] {
  const rows: Array<[string, 'P1' | 'P2', CapabilityRegistryItemDto['status'], string, string]> = [
    ['advisor-network', 'P1', 'FOUNDATION_AVAILABLE', 'যাচাইকৃত উপদেষ্টা', 'Verified advisors'],
    ['service-network', 'P1', 'FOUNDATION_AVAILABLE', 'যাচাইকৃত সেবা', 'Verified services'],
    ['arrival-mode', 'P1', 'FOUNDATION_AVAILABLE', 'অ্যারাইভাল মোড', 'Arrival mode'],
    ['moderated-community', 'P1', 'PILOT_ONLY', 'নিয়ন্ত্রিত কমিউনিটি', 'Moderated community'],
    ['official-connectors', 'P1', 'EXTERNAL_DEPENDENCY', 'সরকারি কানেক্টর', 'Official connectors'],
    ['assisted-centres', 'P2', 'PILOT_ONLY', 'সহায়তা কেন্দ্র', 'Assisted centres'],
    [
      'return-reintegration',
      'P2',
      'FOUNDATION_AVAILABLE',
      'ফেরা ও পুনঃএকত্রীকরণ',
      'Return and reintegration',
    ],
    [
      'regulated-finance',
      'P2',
      'LEGAL_REVIEW_REQUIRED',
      'নিয়ন্ত্রিত অর্থায়ন',
      'Regulated finance',
    ],
  ];
  return rows.map(([key, priority, status, bn, en]) => ({
    key,
    priority,
    status,
    title: { bn, en },
    safeguards: [
      {
        bn: 'লাইভ হওয়ার আগে প্রমাণ ও পর্যালোচনা দরকার',
        en: 'Evidence and review are required before going live',
      },
    ],
    live: false,
  }));
}

/**
 * Read-only fallback for the public platform when the separately deployed API is
 * not configured. It renders the repository's explicitly labelled demo catalogue;
 * account, payment, and case mutations remain disabled.
 */
export async function demoApiRequest<TResponse = unknown>(
  path: string,
  requestOptions: RequestOptions<TResponse> = {},
): Promise<TResponse> {
  const url = new URL(path, 'https://demo.probash.invalid');
  const pathname = url.pathname;
  let payload: unknown;

  if (pathname === '/api/v1/countries') {
    payload = countrySummaries(url);
  } else if (/^\/api\/v1\/countries\/[A-Z]{2}\/routes$/.test(pathname)) {
    const code = pathname.split('/')[4]!;
    payload = routes
      .filter((route) => route.publicationStatus === 'published')
      .filter((route) => route.destinationCountry === code)
      .map(routeSummary);
  } else if (/^\/api\/v1\/countries\/[A-Z]{2}\/profile$/.test(pathname)) {
    const code = pathname.split('/')[4]!;
    const profile = countryProfilesData.profiles.find((entry) => entry.countryCode === code);
    if (!profile) throw new ApiRequestError(404, 'NOT_FOUND', 'Country profile not found');
    payload = {
      ...profile,
      sources: resolveSources(profile.sources),
    };
  } else if (pathname === '/api/v1/routes') {
    const purpose = url.searchParams.get('purpose');
    const country = url.searchParams.get('country')?.toUpperCase();
    payload = routes
      .filter((route) => route.publicationStatus === 'published')
      .filter((route) => !purpose || route.purpose === purpose)
      .filter((route) => !country || route.destinationCountry === country)
      .map(routeSummary);
  } else if (pathname.startsWith('/api/v1/routes/')) {
    const id = decodeURIComponent(pathname.slice('/api/v1/routes/'.length));
    const route = routes.find((entry) => entry.id === id);
    if (!route) throw new ApiRequestError(404, 'NOT_FOUND', 'Route not found');
    payload = routeDetail(route);
  } else if (pathname === '/api/v1/occupations') {
    const query = url.searchParams.get('q')?.toLowerCase();
    const rows = occupationsData.occupations as unknown as OccupationSummaryDto[];
    payload = rows.filter(
      (entry) =>
        !query ||
        entry.key.includes(query) ||
        entry.title.en.toLowerCase().includes(query) ||
        entry.title.bn.includes(query) ||
        (query.includes('ইলেকট্রিশিয়ান') && entry.key === 'electrician') ||
        (query.includes('নার্স') && entry.key === 'nurse') ||
        (query.includes('চালক') && entry.key.includes('driver')),
    );
  } else if (pathname === '/api/v1/jobs') {
    payload = publishedJobs(url).map(jobSummary);
  } else if (pathname.startsWith('/api/v1/jobs/')) {
    const id = decodeURIComponent(pathname.slice('/api/v1/jobs/'.length));
    const job = jobs.find((entry) => entry.id === id);
    if (!job) throw new ApiRequestError(404, 'NOT_FOUND', 'Job not found');
    payload = jobDetail(job);
  } else if (pathname.startsWith('/api/v1/verify/job/')) {
    payload = publicVerification(decodeURIComponent(pathname.slice('/api/v1/verify/job/'.length)));
  } else if (pathname === '/api/v1/verify/offer') {
    payload = scan(requestOptions.body);
  } else if (pathname === '/api/v1/eligibility/evaluate') {
    payload = eligibility(requestOptions.body);
  } else if (pathname === '/api/v1/sources') {
    const country = url.searchParams.get('country')?.toUpperCase();
    payload = sources
      .filter((source) => !country || source.countryCode === country)
      .map(sourceSummary);
  } else if (pathname === '/api/v1/institutions') {
    const country = url.searchParams.get('country')?.toUpperCase();
    payload = institutionsData.institutions.filter(
      (institution) => !country || institution.countryCode === country,
    );
  } else if (pathname === '/api/v1/courses') {
    const institution = url.searchParams.get('institution');
    payload = coursesData.courses.filter(
      (course) => !institution || course.institutionId === institution,
    );
  } else if (pathname === '/api/v1/services') {
    payload = serviceDirectory(url);
  } else if (pathname === '/api/v1/public/outcomes/aggregates') {
    payload = outcomeAggregate(url);
  } else if (pathname === '/api/v1/quick-check') {
    payload = demoQuickCheck(requestOptions.body);
  } else if (pathname === '/api/v1/route-coverages') {
    const country = url.searchParams.get('country')?.toUpperCase();
    payload = routes
      .filter((route) => route.publicationStatus === 'published')
      .filter((route) => !country || route.destinationCountry === country)
      .map(demoRouteCoverage);
  } else if (pathname === '/api/v1/official-actions') {
    payload = demoOfficialActions();
  } else if (pathname === '/api/v1/trust-center') {
    payload = demoTrustCenter();
  } else if (pathname === '/api/v1/mobility-capabilities') {
    payload = demoCapabilities();
  } else {
    throw new ApiRequestError(503, 'API_UNAVAILABLE', 'This action requires the live API service');
  }

  return requestOptions.schema ? requestOptions.schema.parse(payload) : (payload as TResponse);
}
