import { Inject, Injectable } from '@nestjs/common';
import {
  assertCaseTransition,
  canStartCaseForCountry,
  DomainError,
  MILESTONE_ORDER,
  nextCaseStates,
  routeAcceptsApplications,
  uuidv7,
  type CaseState,
  type LocalizedText,
  type MilestoneKey,
} from '@probash/domain';
import { authorize } from '@probash/auth';
import type { Subject } from '@probash/auth';
import type { CaseActionDto, CaseDetailDto, CreateCaseDto } from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { CostsService } from '../costs/costs.service';
import type { CaseMilestoneRecord, CaseRecord, CaseTaskRecord } from '../../storage/records';

const MILESTONE_LABELS: Record<MilestoneKey, LocalizedText> = {
  job_offer_verified: { bn: 'চাকরির প্রস্তাব যাচাই', en: 'Job offer verified' },
  worker_selected: { bn: 'কর্মী নির্বাচিত', en: 'Worker selected' },
  contract_signed: { bn: 'চুক্তি স্বাক্ষরিত', en: 'Contract signed' },
  medical_complete: { bn: 'মেডিকেল সম্পন্ন', en: 'Medical complete' },
  permit_or_visa_verified: { bn: 'ওয়ার্ক পারমিট/ভিসা যাচাই', en: 'Permit or visa verified' },
  emigration_clearance: { bn: 'ইমিগ্রেশন ছাড়পত্র', en: 'Emigration clearance' },
  departure_confirmed: { bn: 'যাত্রা নিশ্চিত', en: 'Departure confirmed' },
  arrival_confirmed: { bn: 'পৌঁছানো নিশ্চিত', en: 'Arrival confirmed' },
  employment_verified: { bn: 'কর্মসংস্থান যাচাই', en: 'Employment verified' },
};

/** §20, §33 — the case: a durable, task-by-task plan with verification milestones. */
@Injectable()
export class CasesService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly costs: CostsService,
  ) {}

  async create(subject: Subject, dto: CreateCaseDto): Promise<CaseDetailDto> {
    const route = await this.storage.routeVersions.require(dto.routeVersionId);
    if (route.publicationStatus !== 'published') {
      throw new DomainError('PRECONDITION_FAILED', 'This route is not published', {
        messageKey: 'verification.pending',
      });
    }
    if (!routeAcceptsApplications(route.status)) {
      // §7 — a paused or closed route can never be the start of a paid process.
      throw new DomainError('PRECONDITION_FAILED', 'This route is not accepting applications now', {
        messageKey: 'route.statusTemporarilyPaused',
        details: { routeStatus: route.status },
      });
    }
    const country = await this.storage.countries.find((c) => c.code === route.destinationCountry);
    if (country && !canStartCaseForCountry(country.supportStatus)) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'This country is not open for applications yet',
        {
          details: { supportStatus: country.supportStatus },
        },
      );
    }

    if (dto.jobId) {
      const job = await this.storage.jobs.require(dto.jobId);
      if (job.publicationStatus !== 'published') {
        throw new DomainError('PRECONDITION_FAILED', 'This job is not currently published');
      }
      if (Date.parse(job.demandValidTo) <= this.clock.now().getTime()) {
        throw new DomainError('PRECONDITION_FAILED', 'This job demand has expired');
      }
    }

    const now = this.clock.nowIso();
    const caseRecord: CaseRecord = {
      id: uuidv7(),
      ownerUserId: subject.userId,
      purpose: dto.purpose,
      state: 'DRAFT',
      routeVersionId: route.id,
      jobId: dto.jobId,
      destinationCountry: route.destinationCountry,
      createdAt: now,
      updatedAt: now,
      documentIds: [],
      history: [],
    };
    await this.storage.cases.put(caseRecord);

    await this.createTasks(caseRecord);
    await this.createMilestones(caseRecord);
    await this.costs.generatePlan(caseRecord);

    await this.audit.record({
      actorUserId: subject.userId,
      action: 'case.created',
      resourceType: 'mobility_case',
      resourceId: caseRecord.id,
      caseId: caseRecord.id,
      metadata: { routeVersionId: route.id, hasJob: String(Boolean(dto.jobId)) },
    });
    await this.events.publish(
      'CaseCreated',
      { purpose: dto.purpose, hasVerifiedJob: Boolean(dto.jobId) },
      {
        actorRef: subject.userId,
        caseRef: caseRecord.id,
        countryCode: route.destinationCountry,
        routeRef: route.routeId,
      },
    );

    return this.detail(subject, caseRecord.id);
  }

  /** Tasks are generated from the route's requirements — never hand-written per case. */
  private async createTasks(caseRecord: CaseRecord): Promise<void> {
    const route = await this.storage.routeVersions.require(caseRecord.routeVersionId);
    let order = 0;
    for (const requirement of [...route.requirements, ...route.postArrivalObligations]) {
      const task: CaseTaskRecord = {
        id: uuidv7(),
        caseId: caseRecord.id,
        order: (order += 1),
        title: requirement.label,
        whyNeeded: requirement.description ?? {
          bn: `${route.officialName.bn} রুটে এই ধাপটি প্রয়োজন।`,
          en: `This step is required on the ${route.officialName.en} route.`,
        },
        owner: requirement.kind === 'sponsor' ? 'employer' : 'worker',
        mandatory: requirement.mandatory,
        status: 'todo',
        dependsOnTaskIds: [],
        estimatedDays: requirement.estimatedDays,
        costItemIds: [],
        performedAt: requirement.performedAt,
        sourceIds: requirement.sources.map((s) => s.sourceId),
        listenKey: 'case.whyNeeded',
      };
      await this.storage.caseTasks.put(task);
    }
  }

  private async createMilestones(caseRecord: CaseRecord): Promise<void> {
    for (const key of MILESTONE_ORDER) {
      const milestone: CaseMilestoneRecord = {
        id: uuidv7(),
        caseId: caseRecord.id,
        key,
        label: MILESTONE_LABELS[key],
        status: 'pending',
        // The party receiving the money never attests its own milestone alone (§25).
        attestableBy:
          key === 'medical_complete'
            ? ['provider', 'platform']
            : key === 'employment_verified'
              ? ['worker', 'government', 'platform']
              : ['platform', 'government'],
        evidenceDocumentIds: [],
      };
      await this.storage.caseMilestones.put(milestone);
    }
  }

  private async assertCanRead(subject: Subject, caseRecord: CaseRecord): Promise<void> {
    const decision = authorize(subject, 'read', {
      type: 'case',
      id: caseRecord.id,
      ownerUserId: caseRecord.ownerUserId,
      caseId: caseRecord.id,
      sensitivity: 'normal',
      countryCode: caseRecord.destinationCountry,
    });
    if (!decision.allowed) {
      throw new DomainError('FORBIDDEN', `Not allowed: ${decision.reason}`);
    }
    await this.audit.recordAccessIfRequired(decision.obligations, {
      actorUserId: subject.userId,
      action: 'case.read',
      resourceType: 'mobility_case',
      resourceId: caseRecord.id,
      caseId: caseRecord.id,
    });
  }

  async list(subject: Subject): Promise<CaseDetailDto[]> {
    const own = await this.storage.cases.list((c) => c.ownerUserId === subject.userId);
    const delegated = subject.delegations?.length
      ? await this.storage.cases.list((c) =>
          Boolean(subject.delegations?.some((d) => d.principalUserId === c.ownerUserId)),
        )
      : [];
    const all = [...own, ...delegated.filter((c) => !own.some((o) => o.id === c.id))];
    return Promise.all(all.map((c) => this.detail(subject, c.id)));
  }

  async detail(subject: Subject, caseId: string): Promise<CaseDetailDto> {
    const caseRecord = await this.storage.cases.require(caseId);
    await this.assertCanRead(subject, caseRecord);

    const tasks = (await this.storage.caseTasks.list((t) => t.caseId === caseId)).sort(
      (a, b) => a.order - b.order,
    );
    const milestones = (await this.storage.caseMilestones.list((m) => m.caseId === caseId)).sort(
      (a, b) => MILESTONE_ORDER.indexOf(a.key) - MILESTONE_ORDER.indexOf(b.key),
    );

    return {
      id: caseRecord.id,
      ownerUserId: caseRecord.ownerUserId,
      state: caseRecord.state,
      purpose: caseRecord.purpose,
      routeVersionId: caseRecord.routeVersionId,
      jobId: caseRecord.jobId,
      destinationCountry: caseRecord.destinationCountry,
      createdAt: caseRecord.createdAt,
      updatedAt: caseRecord.updatedAt,
      documentIds: caseRecord.documentIds,
      tasks: tasks.map((t) => ({
        id: t.id,
        order: t.order,
        title: t.title,
        whyNeeded: t.whyNeeded,
        owner: t.owner,
        mandatory: t.mandatory,
        status: t.status,
        estimatedDays: t.estimatedDays,
        performedAt: t.performedAt,
        dependsOnTaskIds: t.dependsOnTaskIds,
        costItemIds: t.costItemIds,
        sourceIds: t.sourceIds,
        listenKey: t.listenKey,
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        key: m.key,
        label: m.label,
        status: m.status,
        attestableBy: m.attestableBy,
        evidenceDocumentIds: m.evidenceDocumentIds,
        verifiedAt: m.verifiedAt,
        verifiedBy: m.verifiedBy,
      })),
      nextStates: nextCaseStates(caseRecord.state),
    };
  }

  async act(subject: Subject, caseId: string, dto: CaseActionDto): Promise<CaseDetailDto> {
    const caseRecord = await this.storage.cases.require(caseId);
    if (caseRecord.ownerUserId !== subject.userId) {
      // A family co-pilot can watch a case but can never act on it (§28).
      throw new DomainError('FORBIDDEN', 'Only the applicant can act on this case');
    }

    switch (dto.action) {
      case 'complete_task': {
        if (!dto.taskId) throw new DomainError('VALIDATION_FAILED', 'taskId is required');
        const task = await this.storage.caseTasks.require(dto.taskId);
        if (task.caseId !== caseId)
          throw new DomainError('VALIDATION_FAILED', 'Task is not on this case');
        await this.storage.caseTasks.put({
          ...task,
          status: 'done',
          completedAt: this.clock.nowIso(),
        });
        await this.events.publish(
          'CaseTaskCompleted',
          { mandatory: task.mandatory },
          {
            actorRef: subject.userId,
            caseRef: caseId,
          },
        );
        break;
      }
      case 'submit_milestone_evidence': {
        const milestone = await this.requireMilestone(caseId, dto.milestoneKey);
        await this.storage.caseMilestones.put({
          ...milestone,
          status: 'evidence_submitted',
          evidenceDocumentIds: dto.evidenceDocumentIds ?? milestone.evidenceDocumentIds,
        });
        break;
      }
      case 'verify_milestone': {
        // §25 — in production this is an authority/provider attestation, not a
        // self-service action. In the development slice the platform attests so the
        // settlement path can be exercised end to end; the attestation is audited.
        const milestone = await this.requireMilestone(caseId, dto.milestoneKey);
        await this.storage.caseMilestones.put({
          ...milestone,
          status: 'verified',
          verifiedAt: this.clock.nowIso(),
          verifiedBy: 'platform:development-attestation',
        });
        await this.events.publish(
          'MilestoneVerified',
          { milestone: milestone.key },
          {
            actorRef: subject.userId,
            caseRef: caseId,
          },
        );
        break;
      }
      case 'advance': {
        const target = (dto.targetState ?? nextCaseStates(caseRecord.state)[0]) as
          CaseState | undefined;
        if (!target)
          throw new DomainError('PRECONDITION_FAILED', 'This case cannot advance further');
        await this.transition(subject, caseRecord, target, dto.reason);
        break;
      }
      case 'withdraw': {
        await this.transition(subject, caseRecord, 'WITHDRAWN', dto.reason);
        break;
      }
      default:
        throw new DomainError('VALIDATION_FAILED', `Unsupported action: ${String(dto.action)}`);
    }

    await this.audit.record({
      actorUserId: subject.userId,
      action: `case.${dto.action}`,
      resourceType: 'mobility_case',
      resourceId: caseId,
      caseId,
      reason: dto.reason,
    });

    return this.detail(subject, caseId);
  }

  private async requireMilestone(caseId: string, key?: string): Promise<CaseMilestoneRecord> {
    if (!key) throw new DomainError('VALIDATION_FAILED', 'milestoneKey is required');
    const milestone = await this.storage.caseMilestones.find(
      (m) => m.caseId === caseId && m.key === key,
    );
    if (!milestone) throw new DomainError('NOT_FOUND', `Unknown milestone ${key}`);
    return milestone;
  }

  private async transition(
    subject: Subject,
    caseRecord: CaseRecord,
    target: CaseState,
    reason?: string,
  ): Promise<void> {
    assertCaseTransition(caseRecord.state, target);
    await this.storage.cases.put({
      ...caseRecord,
      state: target,
      updatedAt: this.clock.nowIso(),
      history: [
        ...caseRecord.history,
        {
          at: this.clock.nowIso(),
          from: caseRecord.state,
          to: target,
          actorUserId: subject.userId,
          reason,
        },
      ],
    });
  }

  async attachDocument(caseId: string, documentId: string): Promise<void> {
    const caseRecord = await this.storage.cases.require(caseId);
    if (caseRecord.documentIds.includes(documentId)) return;
    await this.storage.cases.put({
      ...caseRecord,
      documentIds: [...caseRecord.documentIds, documentId],
      updatedAt: this.clock.nowIso(),
    });
  }
}
