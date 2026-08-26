import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import type { Env } from '@probash/config';
import { DomainError, organizationCanTransact, uuidv7 } from '@probash/domain';
import type {
  CreatePartnerSubmissionDto,
  DeclarePartnerFeeDto,
  GrantPartnerAccessDto,
  PartnerAccessGrantDto,
  PartnerAnalyticsDto,
  PartnerCandidateDto,
  PartnerFeeDeclarationDto,
  PartnerPipelineEventDto,
  PartnerPortalDashboardDto,
  PartnerPortalKindDto,
  PartnerSubmissionDto,
  UpdatePartnerPipelineDto,
} from '@probash/contracts';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';

const PORTAL_ROLE: Record<PartnerPortalKindDto, Subject['roles'][number]> = {
  employer: 'employer_staff',
  recruiter: 'recruiter_staff',
  institution: 'institution_staff',
  provider: 'provider_staff',
};

const ROLE_PORTAL = Object.fromEntries(
  Object.entries(PORTAL_ROLE).map(([portal, role]) => [role, portal]),
) as Partial<Record<Subject['roles'][number], PartnerPortalKindDto>>;

const ALLOWED_SUBMISSION: Record<PartnerPortalKindDto, CreatePartnerSubmissionDto['kind'][]> = {
  employer: ['employer_job_order'],
  recruiter: ['recruiter_job_order'],
  institution: ['institution_program'],
  provider: ['provider_service'],
};

const BLOCKED_PAYLOAD_KEYS =
  /(^|_)(paid_?rank_?boost|organic_?rank|verification_?status|visa_?guarantee|candidate_?(phone|name|passport|nid))($|_)/i;
const MINIMUM_AGGREGATE_COHORT = 5 as const;

interface PartnerEntity {
  id: string;
  legalName: { bn: string; en: string };
  countryCode: string;
  verificationStatus: string;
}

@Injectable()
export class SupplyService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private async partner(subject: Subject): Promise<{
    portalKind: PartnerPortalKindDto;
    organization: PartnerEntity;
  }> {
    const matchedPortal = subject.roles
      .map((role) => ROLE_PORTAL[role])
      .find((value): value is PartnerPortalKindDto => value !== undefined);
    if (!matchedPortal || !subject.organizationId) {
      throw new DomainError('FORBIDDEN', 'A partner role and organization are required');
    }
    const storedOrganization = await this.storage.organizations.get(subject.organizationId);
    const institution =
      matchedPortal === 'institution'
        ? await this.storage.institutions.get(subject.organizationId)
        : undefined;
    if (!storedOrganization && !institution) {
      throw new DomainError('NOT_FOUND', 'Partner organization was not found');
    }
    if (storedOrganization && !organizationCanTransact(storedOrganization)) {
      throw new DomainError('PRECONDITION_FAILED', 'This organization cannot transact');
    }
    const organization: PartnerEntity = storedOrganization
      ? {
          id: storedOrganization.id,
          legalName: storedOrganization.legalName,
          countryCode: storedOrganization.countryCode,
          verificationStatus: storedOrganization.verification.level,
        }
      : {
          id: institution!.id,
          legalName: institution!.legalName,
          countryCode: institution!.countryCode,
          verificationStatus: institution!.recognizedStatus,
        };
    return { portalKind: matchedPortal, organization };
  }

  private validatePayload(payload: Record<string, unknown>): void {
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (BLOCKED_PAYLOAD_KEYS.test(key)) {
          throw new DomainError(
            'VALIDATION_FAILED',
            `Partner payload cannot set protected field: ${key}`,
          );
        }
        walk(child);
      }
    };
    walk(payload);
  }

  private async validateSources(sourceIds: string[]): Promise<void> {
    for (const sourceId of sourceIds) await this.storage.sources.require(sourceId);
  }

  async createSubmission(
    subject: Subject,
    input: CreatePartnerSubmissionDto,
  ): Promise<PartnerSubmissionDto> {
    const { portalKind, organization } = await this.partner(subject);
    if (!ALLOWED_SUBMISSION[portalKind].includes(input.kind)) {
      throw new DomainError('FORBIDDEN', 'Submission type does not match this partner portal');
    }
    this.validatePayload(input.payload);
    await this.validateSources(input.sourceIds);
    const now = this.clock.nowIso();
    const record: PartnerSubmissionDto = {
      id: uuidv7(),
      organizationId: organization.id,
      createdByUserId: subject.userId,
      ...input,
      countryCode: input.countryCode.toUpperCase(),
      status: 'draft',
      verificationLevel: 'evidence_submitted',
      organicRankInfluencedByPayment: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.partnerSubmissions.put(record);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'partner_submission.created',
      resourceType: 'partner_submission',
      resourceId: record.id,
      metadata: { kind: record.kind, organizationId: organization.id },
    });
    return record;
  }

  async listSubmissions(subject: Subject): Promise<PartnerSubmissionDto[]> {
    const { organization } = await this.partner(subject);
    return (
      await this.storage.partnerSubmissions.list(
        (entry) => entry.organizationId === organization.id,
      )
    ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async submitForReview(subject: Subject, id: string): Promise<PartnerSubmissionDto> {
    const { organization } = await this.partner(subject);
    if (!subject.mfaSatisfied) {
      throw new DomainError('FORBIDDEN', 'MFA is required to submit partner evidence');
    }
    const submission = await this.storage.partnerSubmissions.require(id);
    if (submission.organizationId !== organization.id) {
      throw new DomainError('FORBIDDEN', 'Submission belongs to another organization');
    }
    if (submission.status !== 'draft' && submission.status !== 'rejected') {
      throw new DomainError('CONFLICT', 'Only draft or rejected submissions can be submitted');
    }
    const publicationResource = submission.kind.includes('job_order')
      ? 'job'
      : submission.kind === 'institution_program'
        ? 'program'
        : 'provider';
    const changeId = uuidv7();
    const now = this.clock.nowIso();
    await this.storage.publicationChanges.put({
      id: changeId,
      resourceType: publicationResource,
      resourceId: submission.id,
      summary: `Partner evidence submission: ${submission.title.en}`,
      sourceIds: submission.sourceIds,
      riskLevel: submission.kind.includes('job_order') ? 'high' : 'medium',
      createdByUserId: subject.userId,
      status: 'in_review',
      submittedAt: now,
      createdAt: now,
    });
    const updated: PartnerSubmissionDto = {
      ...submission,
      status: 'in_review',
      publicationChangeId: changeId,
      updatedAt: now,
    };
    await this.storage.partnerSubmissions.put(updated);
    await this.events.publish(
      'PartnerSubmissionReviewRequested',
      { kind: submission.kind },
      { actorRef: subject.userId, organizationRef: organization.id },
    );
    return updated;
  }

  async declareFee(
    subject: Subject,
    input: DeclarePartnerFeeDto,
  ): Promise<PartnerFeeDeclarationDto> {
    const { organization } = await this.partner(subject);
    if ((input.amountStatus === 'known') !== Boolean(input.amount)) {
      throw new DomainError(
        'VALIDATION_FAILED',
        'Known fees require an amount; unknown fees do not',
      );
    }
    if (input.sourceIds.length > 0) await this.validateSources(input.sourceIds);
    if (input.submissionId) {
      const submission = await this.storage.partnerSubmissions.require(input.submissionId);
      if (submission.organizationId !== organization.id) {
        throw new DomainError('FORBIDDEN', 'Fee submission belongs to another organization');
      }
    }
    const record: PartnerFeeDeclarationDto = {
      id: uuidv7(),
      organizationId: organization.id,
      declaredByUserId: subject.userId,
      ...input,
      verificationStatus: 'pending_human_review',
      createdAt: this.clock.nowIso(),
    };
    await this.storage.partnerFeeDeclarations.put(record);
    await this.events.publish(
      'PartnerFeeDeclared',
      { category: record.category, amountStatus: record.amountStatus },
      { actorRef: subject.userId, organizationRef: organization.id },
    );
    return record;
  }

  private async applicationOwner(input: GrantPartnerAccessDto): Promise<{
    userId: string;
    organizationIds: string[];
  }> {
    if (input.applicationType === 'work') {
      const application = await this.storage.workApplications.require(input.applicationId);
      const job = await this.storage.jobs.require(application.jobId);
      return {
        userId: application.userId,
        organizationIds: [job.employerOrganizationId, job.recruiterOrganizationId].filter(
          (value): value is string => Boolean(value),
        ),
      };
    }
    const application = await this.storage.studyApplications.require(input.applicationId);
    return { userId: application.userId, organizationIds: [application.institutionId] };
  }

  async grantAccess(
    subject: Subject,
    input: GrantPartnerAccessDto,
  ): Promise<PartnerAccessGrantDto> {
    const owner = await this.applicationOwner(input);
    if (owner.userId !== subject.userId) {
      throw new DomainError('FORBIDDEN', 'Application not owned');
    }
    if (!owner.organizationIds.includes(input.organizationId)) {
      throw new DomainError('VALIDATION_FAILED', 'Organization is not part of this application');
    }
    if (input.applicationType === 'work') {
      await this.storage.organizations.require(input.organizationId);
    } else {
      await this.storage.institutions.require(input.organizationId);
    }
    const current = await this.storage.partnerAccessGrants.find(
      (entry) =>
        entry.userId === subject.userId &&
        entry.applicationId === input.applicationId &&
        entry.organizationId === input.organizationId &&
        !entry.revokedAt,
    );
    if (current) return current;
    const now = this.clock.nowIso();
    const consentId = uuidv7();
    const user = await this.storage.users.require(subject.userId);
    await this.storage.consents.put({
      id: consentId,
      userId: subject.userId,
      purpose:
        input.applicationType === 'work'
          ? 'employer_shortlisting'
          : 'institution_application_sharing',
      granted: true,
      statement: {
        bn: 'আমি এই আবেদনের সীমিত প্রস্তুতি ও প্রমাণের অবস্থা সংশ্লিষ্ট প্রতিষ্ঠানকে দেখাতে সম্মত। পরিচয়পত্র বা যোগাযোগের তথ্য অন্তর্ভুক্ত নয়।',
        en: 'I consent to share this application’s limited readiness and evidence status with the named organization. Identity documents and contact details are excluded.',
      },
      locale: user.locale,
      grantedAt: now,
      granteeOrganizationId: input.organizationId,
      resourceId: input.applicationId,
    });
    const grant: PartnerAccessGrantDto = {
      id: uuidv7(),
      userId: subject.userId,
      ...input,
      consentId,
      grantedAt: now,
    };
    await this.storage.partnerAccessGrants.put(grant);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'partner_access.granted',
      resourceType: 'application',
      resourceId: input.applicationId,
      metadata: { organizationId: input.organizationId, path: input.applicationType },
    });
    return grant;
  }

  async revokeAccess(subject: Subject, grantId: string): Promise<PartnerAccessGrantDto> {
    const grant = await this.storage.partnerAccessGrants.require(grantId);
    if (grant.userId !== subject.userId) throw new DomainError('FORBIDDEN', 'Grant not owned');
    if (grant.revokedAt) return grant;
    const now = this.clock.nowIso();
    const updated = { ...grant, revokedAt: now };
    await this.storage.partnerAccessGrants.put(updated);
    const consent = await this.storage.consents.require(grant.consentId);
    await this.storage.consents.put({ ...consent, granted: false, revokedAt: now });
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'partner_access.revoked',
      resourceType: 'application',
      resourceId: grant.applicationId,
      metadata: { organizationId: grant.organizationId },
    });
    return updated;
  }

  async listAccess(subject: Subject): Promise<PartnerAccessGrantDto[]> {
    return this.storage.partnerAccessGrants.list((entry) => entry.userId === subject.userId);
  }

  private pseudonymousRef(organizationId: string, userId: string): string {
    return `candidate_${createHmac('sha256', this.env.SESSION_SIGNING_KEY)
      .update(`${organizationId}:${userId}`)
      .digest('base64url')
      .slice(0, 18)}`;
  }

  private readinessBand(percent: number): PartnerCandidateDto['readinessBand'] {
    return percent >= 80 ? 'ready' : percent >= 40 ? 'preparing' : 'early';
  }

  async candidates(subject: Subject): Promise<PartnerCandidateDto[]> {
    const { organization } = await this.partner(subject);
    const grants = await this.storage.partnerAccessGrants.list(
      (entry) => entry.organizationId === organization.id && !entry.revokedAt,
    );
    const candidates: PartnerCandidateDto[] = [];
    for (const grant of grants) {
      const assessments = await this.storage.readinessAssessments.list(
        (entry) => entry.userId === grant.userId,
      );
      const pathAssessment = assessments
        .filter((entry) => entry.path === grant.applicationType)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const readiness = pathAssessment?.readinessPercent ?? 0;
      const evidenceCoverage = pathAssessment?.evidenceCoveragePercent ?? 0;
      if (grant.applicationType === 'work') {
        const application = await this.storage.workApplications.require(grant.applicationId);
        candidates.push({
          pseudonymousCandidateRef: this.pseudonymousRef(organization.id, grant.userId),
          path: 'work',
          applicationId: application.id,
          caseId: application.caseId,
          opportunityId: application.jobId,
          status: application.status,
          readinessBand: this.readinessBand(readiness),
          evidenceCoveragePercent: evidenceCoverage,
          sharedByExplicitConsent: true,
          grantedAt: grant.grantedAt,
        });
      } else {
        const application = await this.storage.studyApplications.require(grant.applicationId);
        candidates.push({
          pseudonymousCandidateRef: this.pseudonymousRef(organization.id, grant.userId),
          path: 'study',
          applicationId: application.id,
          caseId: application.caseId,
          opportunityId: application.programId,
          status: application.status,
          readinessBand: this.readinessBand(readiness),
          evidenceCoveragePercent: evidenceCoverage,
          sharedByExplicitConsent: true,
          grantedAt: grant.grantedAt,
        });
      }
    }
    return candidates;
  }

  async updatePipeline(
    subject: Subject,
    applicationId: string,
    input: UpdatePartnerPipelineDto,
  ): Promise<PartnerPipelineEventDto> {
    const { organization } = await this.partner(subject);
    const grant = await this.storage.partnerAccessGrants.find(
      (entry) =>
        entry.applicationId === applicationId &&
        entry.applicationType === input.applicationType &&
        entry.organizationId === organization.id &&
        !entry.revokedAt,
    );
    if (!grant) throw new DomainError('FORBIDDEN', 'No active applicant consent grant');

    if (input.applicationType === 'work') {
      if (input.action === 'record_enrolment') {
        throw new DomainError('VALIDATION_FAILED', 'Enrolment is only valid for study');
      }
      const application = await this.storage.workApplications.require(applicationId);
      const actionMap: Partial<
        Record<UpdatePartnerPipelineDto['action'], typeof application.status>
      > = {
        screen: 'screening',
        invite_interview: 'interview',
        record_offer: 'offer_received',
        reject: 'rejected',
        withdraw_offer: 'withdrawn',
      };
      const status = actionMap[input.action];
      if (!status) throw new DomainError('VALIDATION_FAILED', 'Unsupported work pipeline action');
      await this.storage.workApplications.put({
        ...application,
        status,
        updatedAt: this.clock.nowIso(),
      });
    } else {
      const application = await this.storage.studyApplications.require(applicationId);
      const actionMap: Record<UpdatePartnerPipelineDto['action'], typeof application.status> = {
        screen: 'institution_review',
        invite_interview: 'institution_review',
        record_offer: 'conditional_offer',
        reject: 'rejected',
        withdraw_offer: 'withdrawn',
        record_enrolment: 'accepted',
      };
      const status = actionMap[input.action];
      await this.storage.studyApplications.put({
        ...application,
        status,
        updatedAt: this.clock.nowIso(),
      });
    }
    const event: PartnerPipelineEventDto = {
      id: uuidv7(),
      applicationId,
      organizationId: organization.id,
      actorUserId: subject.userId,
      ...input,
      occurredAt: this.clock.nowIso(),
    };
    await this.storage.partnerPipelineEvents.put(event);
    await this.events.publish(
      'PartnerPipelineUpdated',
      { path: input.applicationType, action: input.action },
      { actorRef: subject.userId, organizationRef: organization.id },
    );
    return event;
  }

  async analytics(subject: Subject): Promise<PartnerAnalyticsDto> {
    const { organization } = await this.partner(subject);
    const candidates = await this.candidates(subject);
    const verifiedReviews = await this.storage.outcomeReviews.list(
      (entry) => entry.decision === 'verified',
    );
    let reviewedOutcomes = 0;
    let matched = 0;
    for (const review of verifiedReviews) {
      if (review.path === 'work') {
        const outcome = await this.storage.workOutcomes.require(review.outcomeId);
        const mobilityCase = await this.storage.cases.require(outcome.caseId);
        if (!mobilityCase.jobId) continue;
        const job = await this.storage.jobs.require(mobilityCase.jobId);
        if (
          job.employerOrganizationId !== organization.id &&
          job.recruiterOrganizationId !== organization.id
        )
          continue;
        reviewedOutcomes += 1;
        if (outcome.salaryMatched === true && outcome.joinedExpectedEmployer !== false)
          matched += 1;
      } else {
        const outcome = await this.storage.studyOutcomes.require(review.outcomeId);
        const application = await this.storage.studyApplications.require(outcome.applicationId);
        if (application.institutionId !== organization.id) continue;
        reviewedOutcomes += 1;
        if (outcome.enrolled === true) matched += 1;
      }
    }
    const upheldComplaintCount = await this.storage.complaints.count(
      (entry) =>
        entry.organizationId === organization.id &&
        entry.status === 'resolved' &&
        (entry.safetyState === 'verified' || entry.safetyState === 'resolved'),
    );
    const suppressed = reviewedOutcomes < MINIMUM_AGGREGATE_COHORT;
    return {
      organizationId: organization.id,
      minimumCohortSize: MINIMUM_AGGREGATE_COHORT,
      cohortSize: reviewedOutcomes,
      suppressed,
      metrics: suppressed
        ? null
        : {
            applications: candidates.length,
            reviewedOutcomes,
            promisedTermsMatchedPercent:
              reviewedOutcomes === 0 ? null : Math.round((matched / reviewedOutcomes) * 1000) / 10,
            upheldComplaintCount,
          },
      note: {
        bn: suppressed
          ? 'গোপনীয়তা রক্ষায় পাঁচটি মানব-যাচাইকৃত ফলাফল না হওয়া পর্যন্ত সমষ্টিগত মেট্রিক দেখানো হয় না।'
          : 'শুধু মানব-যাচাইকৃত, সম্মত ফলাফল এই সমষ্টিতে আছে।',
        en: suppressed
          ? 'Aggregate metrics remain hidden until five human-reviewed outcomes protect privacy.'
          : 'Only consented, human-reviewed outcomes are included.',
      },
    };
  }

  async dashboard(subject: Subject): Promise<PartnerPortalDashboardDto> {
    const { portalKind, organization } = await this.partner(subject);
    const [submissions, feeDeclarations, candidates, analytics] = await Promise.all([
      this.listSubmissions(subject),
      this.storage.partnerFeeDeclarations.list((entry) => entry.organizationId === organization.id),
      this.candidates(subject),
      this.analytics(subject),
    ]);
    return {
      portalKind,
      organizationId: organization.id,
      organizationName: organization.legalName,
      verificationStatus: organization.verificationStatus,
      submissions,
      feeDeclarations,
      candidates,
      analytics,
      governanceNotice: {
        bn: 'অর্থ প্রদান কখনও অর্গানিক র‍্যাঙ্ক, যোগ্যতা, যাচাই বা ঝুঁকি সিদ্ধান্ত বদলায় না।',
        en: 'Payment never changes organic ranking, eligibility, verification or risk decisions.',
      },
    };
  }
}
