import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import type { Env } from '@probash/config';
import { DomainError, uuidv7 } from '@probash/domain';
import type {
  ComplaintDto,
  ComplaintEventDto,
  CreateComplaintDto,
  CreateHumanReviewDto,
  CreatePublicationChangeDto,
  DecideHumanReviewDto,
  HumanReviewDecisionDto,
  HumanReviewDto,
  PublicationChangeDto,
  ReviewPublicationChangeDto,
  ServiceDirectoryEntryDto,
  UpdateComplaintDto,
} from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ENV } from '../../core/tokens';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { filterSynthetic } from '../../common/synthetic-data.guard';
import type { ComplaintRecord } from '../../storage/records';

const STAFF_ROLES: Subject['roles'] = ['support_agent', 'fraud_analyst', 'platform_admin'];
const REVIEWER_ROLES: Subject['roles'] = ['compliance_reviewer', 'fraud_analyst', 'platform_admin'];

function hasAnyRole(subject: Subject, roles: Subject['roles']): boolean {
  return subject.roles.some((role) => roles.includes(role));
}

@Injectable()
export class OperationsService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly catalogue: CatalogueService,
  ) {}

  private async validateEvidence(userId: string, documentIds: string[]): Promise<void> {
    for (const id of documentIds) {
      const document = await this.storage.documents.require(id);
      if (document.ownerUserId !== userId) {
        throw new DomainError('FORBIDDEN', 'Complaint evidence document not owned');
      }
    }
  }

  private async event(
    complaintId: string,
    actorUserId: string,
    type: ComplaintEventDto['type'],
    note?: string,
    evidenceDocumentIds: string[] = [],
  ): Promise<ComplaintEventDto> {
    const record: ComplaintEventDto = {
      id: uuidv7(),
      complaintId,
      type,
      actorUserId,
      note,
      evidenceDocumentIds,
      occurredAt: this.clock.nowIso(),
    };
    await this.storage.complaintEvents.put(record);
    return record;
  }

  private async detail(record: ComplaintRecord): Promise<ComplaintDto> {
    const events = await this.storage.complaintEvents.list(
      (entry) => entry.complaintId === record.id,
    );
    return { ...record, events: events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)) };
  }

  async createComplaint(userId: string, input: CreateComplaintDto): Promise<ComplaintDto> {
    await this.validateEvidence(userId, input.evidenceDocumentIds);
    if (input.caseId) {
      const mobilityCase = await this.storage.cases.require(input.caseId);
      if (mobilityCase.ownerUserId !== userId) {
        throw new DomainError('FORBIDDEN', 'Complaint case not owned');
      }
    }
    if (input.organizationId) await this.storage.organizations.require(input.organizationId);
    const now = this.clock.nowIso();
    const complaint: ComplaintRecord = {
      id: uuidv7(),
      complainantUserId: userId,
      ...input,
      status: input.evidenceDocumentIds.length > 0 ? 'evidence' : 'submitted',
      safetyState: 'reported',
      priority: input.urgentSafetyRisk ? 'critical' : 'normal',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.complaints.put(complaint);
    await this.event(complaint.id, userId, 'submitted', undefined, input.evidenceDocumentIds);
    await this.audit.record({
      actorUserId: userId,
      action: 'complaint.submitted',
      resourceType: 'complaint',
      resourceId: complaint.id,
      caseId: input.caseId,
      metadata: { category: input.category, urgentSafetyRisk: String(input.urgentSafetyRisk) },
    });
    await this.events.publish(
      'ComplaintOpened',
      { category: input.category, priority: complaint.priority },
      { actorRef: userId, caseRef: input.caseId, organizationRef: input.organizationId },
    );
    return this.detail(complaint);
  }

  async listComplaints(subject: Subject): Promise<ComplaintDto[]> {
    const staff = hasAnyRole(subject, STAFF_ROLES);
    const records = await this.storage.complaints.list(
      (entry) => staff || entry.complainantUserId === subject.userId,
    );
    return Promise.all(
      records
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((entry) => this.detail(entry)),
    );
  }

  async getComplaint(subject: Subject, id: string): Promise<ComplaintDto> {
    const record = await this.storage.complaints.require(id);
    if (record.complainantUserId !== subject.userId && !hasAnyRole(subject, STAFF_ROLES)) {
      throw new DomainError('FORBIDDEN', 'Complaint not accessible');
    }
    return this.detail(record);
  }

  async updateComplaint(
    subject: Subject,
    id: string,
    input: UpdateComplaintDto,
  ): Promise<ComplaintDto> {
    const complaint = await this.storage.complaints.require(id);
    const isOwner = complaint.complainantUserId === subject.userId;
    const isStaff = hasAnyRole(subject, STAFF_ROLES);
    if (input.action === 'add_evidence') {
      if (!isOwner) throw new DomainError('FORBIDDEN', 'Only the complainant can add evidence');
      await this.validateEvidence(subject.userId, input.evidenceDocumentIds);
    } else if (!isStaff) {
      throw new DomainError('FORBIDDEN', 'Complaint handling requires an authorized reviewer');
    }
    const mapping: Record<
      UpdateComplaintDto['action'],
      { status: ComplaintRecord['status']; event: ComplaintEventDto['type'] }
    > = {
      add_evidence: { status: 'evidence', event: 'evidence_added' },
      triage: { status: 'triage', event: 'triaged' },
      request_organization_response: {
        status: 'organization_response',
        event: 'organization_response',
      },
      record_organization_response: {
        status: 'review',
        event: 'organization_response',
      },
      escalate: { status: 'review', event: 'escalated' },
      review: { status: 'review', event: 'reviewed' },
      resolve: { status: 'resolved', event: 'resolved' },
      dismiss: { status: 'dismissed', event: 'reviewed' },
      record_refund: { status: 'resolved', event: 'refund_recorded' },
      record_remedy: { status: 'resolved', event: 'remedy_recorded' },
    };
    const transition = mapping[input.action];
    const updated: ComplaintRecord = {
      ...complaint,
      status: transition.status,
      safetyState:
        input.safetyState ?? (input.action === 'triage' ? 'reviewing' : complaint.safetyState),
      assignedToUserId: isStaff ? subject.userId : complaint.assignedToUserId,
      updatedAt: this.clock.nowIso(),
    };
    await this.storage.complaints.put(updated);
    await this.event(id, subject.userId, transition.event, input.note, input.evidenceDocumentIds);
    if (input.action === 'escalate') {
      await this.events.publish(
        'ComplaintEscalated',
        { priority: updated.priority },
        { actorRef: subject.userId, caseRef: updated.caseId },
      );
    }
    if (['resolve', 'dismiss', 'record_refund', 'record_remedy'].includes(input.action)) {
      await this.events.publish(
        'ComplaintResolved',
        { outcome: input.action },
        { actorRef: subject.userId, caseRef: updated.caseId },
      );
    }
    return this.detail(updated);
  }

  async createReview(userId: string, input: CreateHumanReviewDto): Promise<HumanReviewDto> {
    const now = this.clock.nowIso();
    const review: HumanReviewDto = {
      id: uuidv7(),
      requesterUserId: userId,
      ...input,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.humanReviews.put(review);
    await this.events.publish(
      'HumanReviewRequested',
      { type: review.type, priority: review.priority },
      { actorRef: userId, caseRef: review.caseId },
    );
    return review;
  }

  async listReviews(subject: Subject): Promise<HumanReviewDto[]> {
    const reviewer = hasAnyRole(subject, REVIEWER_ROLES);
    return this.storage.humanReviews.list(
      (entry) => reviewer || entry.requesterUserId === subject.userId,
    );
  }

  async decideReview(
    subject: Subject,
    reviewId: string,
    input: DecideHumanReviewDto,
  ): Promise<HumanReviewDecisionDto> {
    if (!hasAnyRole(subject, REVIEWER_ROLES) || !subject.mfaSatisfied) {
      throw new DomainError('FORBIDDEN', 'Human review decisions require reviewer role and MFA');
    }
    const review = await this.storage.humanReviews.require(reviewId);
    if (review.status === 'decided') throw new DomainError('CONFLICT', 'Review already decided');
    const decision: HumanReviewDecisionDto = {
      id: uuidv7(),
      reviewId,
      reviewerUserId: subject.userId,
      ...input,
      decidedAt: this.clock.nowIso(),
      changesOfficialRule: false,
    };
    await this.storage.humanReviewDecisions.put(decision);
    await this.storage.humanReviews.put({
      ...review,
      status: 'decided',
      assignedToUserId: subject.userId,
      updatedAt: decision.decidedAt,
    });
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'human_review.decided',
      resourceType: 'human_review',
      resourceId: reviewId,
      caseId: review.caseId,
      metadata: { outcome: decision.outcome, sourceCount: String(decision.sourceIds.length) },
    });
    await this.events.publish(
      'HumanReviewDecided',
      { type: review.type, outcome: decision.outcome },
      { actorRef: subject.userId, caseRef: review.caseId },
    );
    return decision;
  }

  private requireResearchAccess(subject: Subject): void {
    if (
      !hasAnyRole(subject, ['researcher', 'compliance_reviewer', 'platform_admin']) ||
      !subject.mfaSatisfied
    ) {
      throw new DomainError('FORBIDDEN', 'Research workflow requires an authorized MFA session');
    }
  }

  async createPublicationChange(
    subject: Subject,
    input: CreatePublicationChangeDto,
  ): Promise<PublicationChangeDto> {
    this.requireResearchAccess(subject);
    for (const sourceId of input.sourceIds) await this.storage.sources.require(sourceId);
    const change: PublicationChangeDto = {
      id: uuidv7(),
      createdByUserId: subject.userId,
      ...input,
      status: 'draft',
      createdAt: this.clock.nowIso(),
    };
    await this.storage.publicationChanges.put(change);
    return change;
  }

  async submitPublicationChange(subject: Subject, id: string): Promise<PublicationChangeDto> {
    this.requireResearchAccess(subject);
    const change = await this.storage.publicationChanges.require(id);
    if (change.createdByUserId !== subject.userId || change.status !== 'draft') {
      throw new DomainError('PRECONDITION_FAILED', 'Only the author can submit a draft change');
    }
    const updated = { ...change, status: 'in_review' as const, submittedAt: this.clock.nowIso() };
    await this.storage.publicationChanges.put(updated);
    return updated;
  }

  async reviewPublicationChange(
    subject: Subject,
    id: string,
    input: ReviewPublicationChangeDto,
  ): Promise<PublicationChangeDto> {
    if (!hasAnyRole(subject, ['compliance_reviewer', 'platform_admin']) || !subject.mfaSatisfied) {
      throw new DomainError('FORBIDDEN', 'Publication approval requires reviewer role and MFA');
    }
    const change = await this.storage.publicationChanges.require(id);
    if (change.status !== 'in_review') {
      throw new DomainError('PRECONDITION_FAILED', 'Change is not awaiting review');
    }
    if (change.createdByUserId === subject.userId) {
      throw new DomainError('FORBIDDEN', 'A researcher cannot approve their own change');
    }
    const updated: PublicationChangeDto = {
      ...change,
      status: input.decision === 'approve' ? 'approved' : 'rejected',
      reviewedAt: this.clock.nowIso(),
      reviewedByUserId: subject.userId,
      reviewNote: input.note,
    };
    await this.storage.publicationChanges.put(updated);
    await this.audit.record({
      actorUserId: subject.userId,
      action: `publication_change.${updated.status}`,
      resourceType: 'publication_change',
      resourceId: id,
      metadata: { resourceType: change.resourceType, riskLevel: change.riskLevel },
    });
    await this.events.publish(
      'PublicationChangeReviewed',
      { decision: updated.status, riskLevel: updated.riskLevel },
      { actorRef: subject.userId },
    );
    return updated;
  }

  async serviceDirectory(options: {
    type?: string;
    countryCode?: string;
  }): Promise<ServiceDirectoryEntryDto[]> {
    const organizations = filterSynthetic(await this.storage.organizations.list(), this.env);
    const complaints = await this.storage.complaints.list();
    return Promise.all(
      organizations
        .filter((item) => !options.type || item.type === options.type)
        .filter((item) => !options.countryCode || item.countryCode === options.countryCode)
        .map(async (organization) => {
          const related = complaints.filter((item) => item.organizationId === organization.id);
          const publicIncidents = related.filter((item) =>
            ['corroborated', 'verified', 'resolved'].includes(item.safetyState),
          );
          const checkedMethods = organization.verification.facets
            .filter((facet) => facet.checked)
            .map((facet) => facet.method);
          const officialStatus: ServiceDirectoryEntryDto['officialStatus'] =
            organization.suspendedAt
              ? 'suspended'
              : checkedMethods.some((method) =>
                    ['authority_confirmation', 'transaction_evidence'].includes(method),
                  )
                ? 'verified'
                : checkedMethods.length > 0
                  ? 'partially_verified'
                  : 'unverified';
          const sourceIds = [
            ...organization.verification.facets.flatMap((facet) =>
              facet.sourceId ? [facet.sourceId] : [],
            ),
            ...organization.licences.flatMap((licence) =>
              licence.sourceId ? [licence.sourceId] : [],
            ),
          ];
          return {
            id: organization.id,
            type: organization.type,
            legalName: organization.legalName,
            countryCode: organization.countryCode,
            officialStatus,
            officialDomain: organization.officialDomain,
            officialContact: { email: organization.contactEmail },
            services: [],
            licences: organization.licences.map((licence) => ({
              number: licence.number,
              status: licence.status,
              validTo: licence.validTo,
            })),
            complaintCount: related.length,
            publishedSafetyIncidentCount: publicIncidents.length,
            outcomeCount: organization.trustSignals?.completedPlacements ?? 0,
            sources: await this.catalogue.sourceSummaries(sourceIds),
            lastVerifiedAt: organization.verification.lastVerifiedAt,
            isSyntheticDemoData: organization.isSyntheticDemoData,
          };
        }),
    );
  }
}
